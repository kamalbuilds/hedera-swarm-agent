import { EventEmitter } from 'events';
import { 
    Client, 
    ContractExecuteTransaction,
    ContractFunctionParameters,
    AccountId 
} from '@hashgraph/sdk';

export interface Task {
    id: string;
    description: string;
    requiredCapabilities: string[];
    bounty: number;
    deadline: number;
    requester: string;
    minAgents?: number;
    maxAgents?: number;
    priority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface AgentBid {
    agentId: string;
    taskId: string;
    estimatedTime: number;
    requestedReward: number;
    confidence: number;
    capabilities: string[];
    reputation: number;
}

export interface TaskAssignment {
    taskId: string;
    assignedAgents: string[];
    totalReward: number;
    deadline: number;
}

export interface AgentProfile {
    accountId: string;
    capabilities: string[];
    reputation: number;
    activeTaskCount: number;
    completedTaskCount: number;
    successRate: number;
    averageCompletionTime: number;
    specializations?: string[];
}

export class TaskDistributor extends EventEmitter {
    private client: Client;
    private orchestratorAddress: string;
    private taskQueue: Map<string, Task> = new Map();
    private agentBids: Map<string, AgentBid[]> = new Map();
    private agentProfiles: Map<string, AgentProfile> = new Map();
    private activeAssignments: Map<string, TaskAssignment> = new Map();
    
    // Configuration
    private config = {
        bidWindowDuration: 2 * 60 * 1000, // 2 minutes
        maxBidsPerTask: 20,
        reputationWeight: 0.4,
        confidenceWeight: 0.3,
        priceWeight: 0.3,
        capabilityMatchBonus: 0.2
    };
    
    constructor(client: Client, orchestratorAddress: string) {
        super();
        this.client = client;
        this.orchestratorAddress = orchestratorAddress;
    }
    
    /**
     * Announce a new task to the swarm
     */
    async announceTask(task: Task): Promise<void> {
        this.taskQueue.set(task.id, task);
        this.agentBids.set(task.id, []);
        
        this.emit('taskAnnounced', task);
        
        // Start bid collection window
        setTimeout(() => {
            this.evaluateBidsAndAssign(task.id);
        }, this.config.bidWindowDuration);
    }
    
    /**
     * Submit a bid for a task
     */
    submitBid(bid: AgentBid): void {
        const task = this.taskQueue.get(bid.taskId);
        if (!task) {
            throw new Error('Task not found');
        }
        
        const bids = this.agentBids.get(bid.taskId) || [];
        
        // Check if agent already bid
        if (bids.find(b => b.agentId === bid.agentId)) {
            throw new Error('Agent already submitted a bid');
        }
        
        // Validate agent capabilities
        const hasRequiredCapabilities = this.validateCapabilities(
            bid.capabilities,
            task.requiredCapabilities
        );
        
        if (!hasRequiredCapabilities) {
            throw new Error('Agent lacks required capabilities');
        }
        
        bids.push(bid);
        this.agentBids.set(bid.taskId, bids);
        
        this.emit('bidSubmitted', bid);
    }
    
    /**
     * Evaluate bids and assign agents to task
     */
    private async evaluateBidsAndAssign(taskId: string): Promise<void> {
        const task = this.taskQueue.get(taskId);
        const bids = this.agentBids.get(taskId);
        
        if (!task || !bids || bids.length === 0) {
            this.emit('taskAssignmentFailed', {
                taskId,
                reason: 'No valid bids received'
            });
            return;
        }
        
        // Score and rank bids
        const scoredBids = this.scoreBids(bids, task);
        
        // Select optimal agents
        const selectedAgents = this.selectOptimalAgents(
            scoredBids,
            task.minAgents || 1,
            task.maxAgents || 5
        );
        
        if (selectedAgents.length === 0) {
            this.emit('taskAssignmentFailed', {
                taskId,
                reason: 'No suitable agents found'
            });
            return;
        }
        
        // Create assignment
        const assignment: TaskAssignment = {
            taskId,
            assignedAgents: selectedAgents.map(bid => bid.agentId),
            totalReward: task.bounty,
            deadline: task.deadline
        };
        
        this.activeAssignments.set(taskId, assignment);
        
        // Execute on-chain assignment
        await this.assignTaskOnChain(taskId, assignment.assignedAgents);
        
        // Update agent profiles
        for (const agentId of assignment.assignedAgents) {
            this.updateAgentTaskCount(agentId, 1);
        }
        
        this.emit('taskAssigned', assignment);
        
        // Clean up
        this.taskQueue.delete(taskId);
        this.agentBids.delete(taskId);
    }
    
    /**
     * Score bids based on multiple factors
     */
    private scoreBids(bids: AgentBid[], task: Task): (AgentBid & { score: number })[] {
        return bids.map(bid => {
            let score = 0;
            
            // Reputation score (0-1)
            const reputationScore = Math.min(bid.reputation / 100, 1);
            score += reputationScore * this.config.reputationWeight;
            
            // Confidence score (0-1)
            score += bid.confidence * this.config.confidenceWeight;
            
            // Price score (inverse - lower price = higher score)
            const priceRatio = 1 - (bid.requestedReward / task.bounty);
            score += Math.max(0, priceRatio) * this.config.priceWeight;
            
            // Capability match bonus
            const capabilityScore = this.calculateCapabilityScore(
                bid.capabilities,
                task.requiredCapabilities
            );
            score += capabilityScore * this.config.capabilityMatchBonus;
            
            // Time efficiency bonus (faster completion = higher score)
            const timeScore = Math.max(0, 1 - (bid.estimatedTime / (task.deadline - Date.now())));
            score += timeScore * 0.1;
            
            // Agent workload penalty
            const agentProfile = this.agentProfiles.get(bid.agentId);
            if (agentProfile && agentProfile.activeTaskCount > 3) {
                score *= 0.8; // 20% penalty for overloaded agents
            }
            
            return { ...bid, score };
        }).sort((a, b) => b.score - a.score);
    }
    
    /**
     * Select optimal combination of agents
     */
    private selectOptimalAgents(
        scoredBids: (AgentBid & { score: number })[],
        minAgents: number,
        maxAgents: number
    ): AgentBid[] {
        const selected: AgentBid[] = [];
        const usedCapabilities = new Set<string>();
        
        // Greedy selection with diversity consideration
        for (const bid of scoredBids) {
            if (selected.length >= maxAgents) {
                break;
            }
            
            // Check if agent adds new capabilities
            const newCapabilities = bid.capabilities.filter(
                cap => !usedCapabilities.has(cap)
            );
            
            // Always select if under minimum or adds significant value
            if (selected.length < minAgents || 
                newCapabilities.length > 0 || 
                bid.score > 0.8) {
                
                selected.push(bid);
                bid.capabilities.forEach(cap => usedCapabilities.add(cap));
            }
        }
        
        // Ensure minimum agents
        if (selected.length < minAgents && scoredBids.length >= minAgents) {
            return scoredBids.slice(0, minAgents);
        }
        
        return selected;
    }
    
    /**
     * Calculate capability match score
     */
    private calculateCapabilityScore(
        agentCapabilities: string[],
        requiredCapabilities: string[]
    ): number {
        const requiredSet = new Set(requiredCapabilities);
        const matchCount = agentCapabilities.filter(cap => requiredSet.has(cap)).length;
        const extraCount = agentCapabilities.length - matchCount;
        
        // Perfect match = 1.0, extra capabilities add bonus
        const matchScore = matchCount / requiredCapabilities.length;
        const extraBonus = Math.min(extraCount * 0.05, 0.2); // Max 20% bonus
        
        return Math.min(matchScore + extraBonus, 1);
    }
    
    /**
     * Validate agent has required capabilities
     */
    private validateCapabilities(
        agentCapabilities: string[],
        requiredCapabilities: string[]
    ): boolean {
        const agentCaps = new Set(agentCapabilities);
        return requiredCapabilities.every(cap => agentCaps.has(cap));
    }
    
    /**
     * Execute task assignment on-chain
     */
    private async assignTaskOnChain(
        taskId: string,
        agentIds: string[]
    ): Promise<void> {
        const contract = new ContractExecuteTransaction()
            .setContractId(this.orchestratorAddress)
            .setGas(300000)
            .setFunction(
                "assignTask",
                new ContractFunctionParameters()
                    .addString(taskId)
                    .addAddressArray(agentIds.map(id => AccountId.fromString(id)))
            );
            
        const txResponse = await contract.execute(this.client);
        const receipt = await txResponse.getReceipt(this.client);
        
        if (receipt.status.toString() !== 'SUCCESS') {
            throw new Error('Failed to assign task on-chain');
        }
    }
    
    /**
     * Update agent profile
     */
    updateAgentProfile(profile: AgentProfile): void {
        this.agentProfiles.set(profile.accountId, profile);
    }
    
    /**
     * Update agent's active task count
     */
    private updateAgentTaskCount(agentId: string, delta: number): void {
        const profile = this.agentProfiles.get(agentId);
        if (profile) {
            profile.activeTaskCount += delta;
        }
    }
    
    /**
     * Handle task completion
     */
    async handleTaskCompletion(
        taskId: string,
        agentId: string,
        success: boolean
    ): Promise<void> {
        const assignment = this.activeAssignments.get(taskId);
        if (!assignment) {
            return;
        }
        
        // Update agent profile
        const profile = this.agentProfiles.get(agentId);
        if (profile) {
            profile.activeTaskCount = Math.max(0, profile.activeTaskCount - 1);
            profile.completedTaskCount++;
            
            if (success) {
                const successRate = (profile.successRate * (profile.completedTaskCount - 1) + 1) 
                    / profile.completedTaskCount;
                profile.successRate = successRate;
            } else {
                const successRate = (profile.successRate * (profile.completedTaskCount - 1)) 
                    / profile.completedTaskCount;
                profile.successRate = successRate;
            }
        }
        
        // Check if all agents completed
        // In production, track individual agent completions
        
        this.emit('taskCompleted', {
            taskId,
            agentId,
            success
        });
    }
    
    /**
     * Get task queue status
     */
    getQueueStatus(): {
        pendingTasks: number;
        activeTasks: number;
        totalBids: number;
    } {
        let totalBids = 0;
        for (const bids of this.agentBids.values()) {
            totalBids += bids.length;
        }
        
        return {
            pendingTasks: this.taskQueue.size,
            activeTasks: this.activeAssignments.size,
            totalBids
        };
    }
    
    /**
     * Get agent workload
     */
    getAgentWorkload(agentId: string): number {
        const profile = this.agentProfiles.get(agentId);
        return profile?.activeTaskCount || 0;
    }
    
    /**
     * Emergency task cancellation
     */
    async cancelTask(taskId: string, reason: string): Promise<void> {
        // Remove from queue
        this.taskQueue.delete(taskId);
        this.agentBids.delete(taskId);
        
        // Handle active assignment
        const assignment = this.activeAssignments.get(taskId);
        if (assignment) {
            // Update agent counts
            for (const agentId of assignment.assignedAgents) {
                this.updateAgentTaskCount(agentId, -1);
            }
            
            this.activeAssignments.delete(taskId);
        }
        
        this.emit('taskCancelled', { taskId, reason });
    }
}