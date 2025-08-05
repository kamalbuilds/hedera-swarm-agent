import { 
    Client, 
    TopicId, 
    TopicMessageSubmitTransaction,
    TopicMessageQuery,
    AccountId,
    PrivateKey,
    Timestamp
} from '@hashgraph/sdk';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface ConsensusProposal {
    id: string;
    taskId: string;
    solution: any;
    proposer: string;
    supporters: Map<string, Vote>;
    rejectors: Map<string, Vote>;
    confidence: number;
    timestamp: number;
    deadline: number;
    status: 'pending' | 'accepted' | 'rejected' | 'expired';
}

export interface Vote {
    voter: string;
    weight: number; // Based on reputation
    timestamp: number;
    reason?: string;
}

export interface ConsensusConfig {
    votingThreshold: number; // e.g., 0.66 for 2/3 majority
    votingPeriod: number; // in milliseconds
    minParticipants: number;
    reputationWeighting: boolean;
}

export interface AgentReputation {
    accountId: string;
    score: number;
    tasksCompleted: number;
    consensusParticipation: number;
}

export class ConsensusEngine extends EventEmitter {
    private client: Client;
    private proposals: Map<string, ConsensusProposal> = new Map();
    private config: ConsensusConfig;
    private reputations: Map<string, AgentReputation> = new Map();
    private consensusTopicId: TopicId;
    private subscriptions: Map<string, any> = new Map();
    
    constructor(
        client: Client,
        consensusTopicId: string,
        config?: Partial<ConsensusConfig>
    ) {
        super();
        this.client = client;
        this.consensusTopicId = TopicId.fromString(consensusTopicId);
        
        // Default configuration
        this.config = {
            votingThreshold: 0.66,
            votingPeriod: 5 * 60 * 1000, // 5 minutes
            minParticipants: 3,
            reputationWeighting: true,
            ...config
        };
        
        this.initialize();
    }
    
    private initialize(): void {
        // Subscribe to consensus topic
        this.subscribeToConsensusTopic();
        
        // Start periodic cleanup of expired proposals
        setInterval(() => this.cleanupExpiredProposals(), 60000); // Every minute
    }
    
    /**
     * Propose a solution for consensus
     */
    async proposeSolution(
        taskId: string,
        solution: any,
        proposerAccount: string,
        confidence: number = 0.5
    ): Promise<string> {
        const proposalId = uuidv4();
        const deadline = Date.now() + this.config.votingPeriod;
        
        const proposal: ConsensusProposal = {
            id: proposalId,
            taskId,
            solution,
            proposer: proposerAccount,
            supporters: new Map([[proposerAccount, {
                voter: proposerAccount,
                weight: this.getAgentWeight(proposerAccount),
                timestamp: Date.now()
            }]]),
            rejectors: new Map(),
            confidence,
            timestamp: Date.now(),
            deadline,
            status: 'pending'
        };
        
        this.proposals.set(proposalId, proposal);
        
        // Broadcast proposal to consensus topic
        await this.broadcastProposal(proposal);
        
        // Emit event
        this.emit('proposalCreated', proposal);
        
        // Set timeout for proposal deadline
        setTimeout(() => this.evaluateProposal(proposalId), this.config.votingPeriod);
        
        return proposalId;
    }
    
    /**
     * Vote on a proposal
     */
    async voteOnProposal(
        proposalId: string,
        voterAccount: string,
        support: boolean,
        reason?: string
    ): Promise<void> {
        const proposal = this.proposals.get(proposalId);
        if (!proposal) {
            throw new Error('Proposal not found');
        }
        
        if (proposal.status !== 'pending') {
            throw new Error('Proposal is no longer pending');
        }
        
        if (Date.now() > proposal.deadline) {
            throw new Error('Voting period has expired');
        }
        
        // Check if already voted
        if (proposal.supporters.has(voterAccount) || proposal.rejectors.has(voterAccount)) {
            throw new Error('Already voted on this proposal');
        }
        
        const vote: Vote = {
            voter: voterAccount,
            weight: this.getAgentWeight(voterAccount),
            timestamp: Date.now(),
            reason
        };
        
        if (support) {
            proposal.supporters.set(voterAccount, vote);
        } else {
            proposal.rejectors.set(voterAccount, vote);
        }
        
        // Broadcast vote
        await this.broadcastVote(proposalId, vote, support);
        
        // Check if consensus reached early
        this.checkEarlyConsensus(proposalId);
        
        this.emit('voteReceived', {
            proposalId,
            vote,
            support
        });
    }
    
    /**
     * Evaluate a proposal after voting period
     */
    private evaluateProposal(proposalId: string): void {
        const proposal = this.proposals.get(proposalId);
        if (!proposal || proposal.status !== 'pending') {
            return;
        }
        
        const result = this.calculateConsensus(proposal);
        
        proposal.status = result.accepted ? 'accepted' : 'rejected';
        
        this.emit('consensusReached', {
            proposalId,
            taskId: proposal.taskId,
            accepted: result.accepted,
            supportPercentage: result.supportPercentage,
            totalVotes: result.totalVotes,
            solution: result.accepted ? proposal.solution : null
        });
        
        // Update agent reputations based on outcome
        this.updateReputations(proposal, result.accepted);
    }
    
    /**
     * Calculate consensus based on votes
     */
    private calculateConsensus(proposal: ConsensusProposal): {
        accepted: boolean;
        supportPercentage: number;
        totalVotes: number;
    } {
        let supportWeight = 0;
        let rejectWeight = 0;
        
        // Calculate weighted support
        for (const vote of proposal.supporters.values()) {
            supportWeight += vote.weight;
        }
        
        for (const vote of proposal.rejectors.values()) {
            rejectWeight += vote.weight;
        }
        
        const totalWeight = supportWeight + rejectWeight;
        const totalVotes = proposal.supporters.size + proposal.rejectors.size;
        
        // Check minimum participation
        if (totalVotes < this.config.minParticipants) {
            return {
                accepted: false,
                supportPercentage: 0,
                totalVotes
            };
        }
        
        const supportPercentage = totalWeight > 0 ? supportWeight / totalWeight : 0;
        const accepted = supportPercentage >= this.config.votingThreshold;
        
        return {
            accepted,
            supportPercentage,
            totalVotes
        };
    }
    
    /**
     * Check if consensus can be reached early
     */
    private checkEarlyConsensus(proposalId: string): void {
        const proposal = this.proposals.get(proposalId);
        if (!proposal || proposal.status !== 'pending') {
            return;
        }
        
        const result = this.calculateConsensus(proposal);
        
        // Get total possible voters (simplified - in production would query from orchestrator)
        const totalPossibleVoters = 10; // Example
        
        // Check if remaining votes cannot change outcome
        const remainingVoters = totalPossibleVoters - result.totalVotes;
        const maxPossibleRejectWeight = remainingVoters * 100; // Max reputation
        
        let currentSupportWeight = 0;
        let currentRejectWeight = 0;
        
        for (const vote of proposal.supporters.values()) {
            currentSupportWeight += vote.weight;
        }
        
        for (const vote of proposal.rejectors.values()) {
            currentRejectWeight += vote.weight;
        }
        
        const worstCaseSupport = currentSupportWeight / 
            (currentSupportWeight + currentRejectWeight + maxPossibleRejectWeight);
            
        if (worstCaseSupport >= this.config.votingThreshold) {
            // Consensus reached early
            this.evaluateProposal(proposalId);
        }
    }
    
    /**
     * Get agent's voting weight based on reputation
     */
    private getAgentWeight(accountId: string): number {
        if (!this.config.reputationWeighting) {
            return 1; // Equal weight for all
        }
        
        const reputation = this.reputations.get(accountId);
        if (!reputation) {
            return 50; // Default weight for new agents
        }
        
        return reputation.score;
    }
    
    /**
     * Update agent reputations based on consensus outcome
     */
    private updateReputations(proposal: ConsensusProposal, accepted: boolean): void {
        // Reward agents who voted with consensus
        const correctVoters = accepted ? proposal.supporters : proposal.rejectors;
        const incorrectVoters = accepted ? proposal.rejectors : proposal.supporters;
        
        // Increase reputation for correct voters
        for (const vote of correctVoters.values()) {
            this.adjustReputation(vote.voter, 5); // +5 points
        }
        
        // Slight decrease for incorrect voters
        for (const vote of incorrectVoters.values()) {
            this.adjustReputation(vote.voter, -2); // -2 points
        }
        
        // Bonus for proposal creator if accepted
        if (accepted) {
            this.adjustReputation(proposal.proposer, 10); // +10 points
        }
    }
    
    /**
     * Adjust an agent's reputation
     */
    private adjustReputation(accountId: string, delta: number): void {
        let reputation = this.reputations.get(accountId);
        
        if (!reputation) {
            reputation = {
                accountId,
                score: 100, // Starting score
                tasksCompleted: 0,
                consensusParticipation: 0
            };
            this.reputations.set(accountId, reputation);
        }
        
        reputation.score = Math.max(0, Math.min(200, reputation.score + delta));
        reputation.consensusParticipation++;
        
        this.emit('reputationUpdated', {
            accountId,
            newScore: reputation.score,
            delta
        });
    }
    
    /**
     * Broadcast proposal to consensus topic
     */
    private async broadcastProposal(proposal: ConsensusProposal): Promise<void> {
        const message = {
            type: 'CONSENSUS_PROPOSAL',
            proposal: {
                id: proposal.id,
                taskId: proposal.taskId,
                solution: proposal.solution,
                proposer: proposal.proposer,
                confidence: proposal.confidence,
                deadline: proposal.deadline
            },
            timestamp: Date.now()
        };
        
        await new TopicMessageSubmitTransaction()
            .setTopicId(this.consensusTopicId)
            .setMessage(JSON.stringify(message))
            .execute(this.client);
    }
    
    /**
     * Broadcast vote to consensus topic
     */
    private async broadcastVote(
        proposalId: string, 
        vote: Vote, 
        support: boolean
    ): Promise<void> {
        const message = {
            type: 'CONSENSUS_VOTE',
            proposalId,
            vote: {
                voter: vote.voter,
                support,
                reason: vote.reason
            },
            timestamp: Date.now()
        };
        
        await new TopicMessageSubmitTransaction()
            .setTopicId(this.consensusTopicId)
            .setMessage(JSON.stringify(message))
            .execute(this.client);
    }
    
    /**
     * Subscribe to consensus topic for proposals and votes
     */
    private subscribeToConsensusTopic(): void {
        const query = new TopicMessageQuery()
            .setTopicId(this.consensusTopicId)
            .setStartTime(0);
            
        query.subscribe(this.client, (message) => {
            try {
                const data = JSON.parse(Buffer.from(message.contents).toString());
                
                switch (data.type) {
                    case 'CONSENSUS_PROPOSAL':
                        this.handleRemoteProposal(data.proposal);
                        break;
                    case 'CONSENSUS_VOTE':
                        this.handleRemoteVote(data.proposalId, data.vote);
                        break;
                }
            } catch (error) {
                console.error('Error processing consensus message:', error);
            }
        });
        
        this.subscriptions.set('consensus', query);
    }
    
    /**
     * Handle proposal from another agent
     */
    private handleRemoteProposal(proposalData: any): void {
        if (this.proposals.has(proposalData.id)) {
            return; // Already have this proposal
        }
        
        const proposal: ConsensusProposal = {
            ...proposalData,
            supporters: new Map(),
            rejectors: new Map(),
            status: 'pending'
        };
        
        // Add proposer as first supporter
        proposal.supporters.set(proposalData.proposer, {
            voter: proposalData.proposer,
            weight: this.getAgentWeight(proposalData.proposer),
            timestamp: Date.now()
        });
        
        this.proposals.set(proposal.id, proposal);
        this.emit('proposalReceived', proposal);
        
        // Set timeout for evaluation
        const timeRemaining = proposal.deadline - Date.now();
        if (timeRemaining > 0) {
            setTimeout(() => this.evaluateProposal(proposal.id), timeRemaining);
        }
    }
    
    /**
     * Handle vote from another agent
     */
    private handleRemoteVote(proposalId: string, voteData: any): void {
        const proposal = this.proposals.get(proposalId);
        if (!proposal || proposal.status !== 'pending') {
            return;
        }
        
        // Check if already voted
        if (proposal.supporters.has(voteData.voter) || 
            proposal.rejectors.has(voteData.voter)) {
            return;
        }
        
        const vote: Vote = {
            voter: voteData.voter,
            weight: this.getAgentWeight(voteData.voter),
            timestamp: Date.now(),
            reason: voteData.reason
        };
        
        if (voteData.support) {
            proposal.supporters.set(voteData.voter, vote);
        } else {
            proposal.rejectors.set(voteData.voter, vote);
        }
        
        this.checkEarlyConsensus(proposalId);
        
        this.emit('voteReceived', {
            proposalId,
            vote,
            support: voteData.support
        });
    }
    
    /**
     * Clean up expired proposals
     */
    private cleanupExpiredProposals(): void {
        const now = Date.now();
        
        for (const [id, proposal] of this.proposals) {
            if (proposal.status === 'pending' && now > proposal.deadline + 60000) {
                proposal.status = 'expired';
                this.emit('proposalExpired', id);
            }
            
            // Remove old completed proposals (keep for 1 hour)
            if (proposal.status !== 'pending' && 
                now > proposal.deadline + 3600000) {
                this.proposals.delete(id);
            }
        }
    }
    
    /**
     * Get current proposals
     */
    getActiveProposals(): ConsensusProposal[] {
        return Array.from(this.proposals.values())
            .filter(p => p.status === 'pending');
    }
    
    /**
     * Get proposal by ID
     */
    getProposal(proposalId: string): ConsensusProposal | undefined {
        return this.proposals.get(proposalId);
    }
    
    /**
     * Get agent reputation
     */
    getReputation(accountId: string): AgentReputation | undefined {
        return this.reputations.get(accountId);
    }
    
    /**
     * Load reputation data (from smart contract or storage)
     */
    async loadReputations(reputationData: AgentReputation[]): Promise<void> {
        for (const rep of reputationData) {
            this.reputations.set(rep.accountId, rep);
        }
    }
}