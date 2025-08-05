// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./interfaces/IHederaTokenService.sol";
import "./interfaces/ISwarmOrchestrator.sol";

/**
 * @title SwarmOrchestrator
 * @dev Main contract for managing AI agent swarms on Hedera
 */
contract SwarmOrchestrator is ISwarmOrchestrator, ReentrancyGuard, Ownable {
    using Counters for Counters.Counter;
    
    // State variables
    mapping(address => Agent) public agents;
    mapping(string => Task) public tasks;
    mapping(address => uint256) public agentStakes;
    mapping(string => address[]) public taskAssignments;
    mapping(address => string[]) public agentActiveTasks;
    
    Counters.Counter private taskIdCounter;
    
    uint256 public constant MIN_STAKE = 10 * 10**8; // 10 HBAR in tinybars
    uint256 public constant REPUTATION_DECAY_RATE = 1; // 1% per week
    uint256 public constant MAX_AGENTS_PER_TASK = 10;
    
    address public reputationOracle;
    address public evolutionEngine;
    address public knowledgeGraph;
    
    // Events
    event AgentRegistered(address indexed agent, string[] capabilities, uint256 stake);
    event TaskCreated(string indexed taskId, address requester, uint256 bounty);
    event TaskAssigned(string indexed taskId, address[] agents);
    event SolutionSubmitted(string indexed taskId, string solutionHash);
    event ConsensusReached(string indexed taskId, string finalSolution);
    event RewardsDistributed(string indexed taskId, address[] agents, uint256[] rewards);
    event AgentSlashed(address indexed agent, uint256 amount, string reason);
    
    modifier onlyRegisteredAgent() {
        require(agents[msg.sender].isActive, "Not a registered agent");
        _;
    }
    
    modifier onlyTaskRequester(string memory taskId) {
        require(tasks[taskId].requester == msg.sender, "Not task requester");
        _;
    }
    
    constructor() Ownable(msg.sender) {
        // Initialize with deployer as owner
    }
    
    /**
     * @dev Register a new agent in the swarm
     * @param capabilities Array of capability strings
     */
    function registerAgent(string[] memory capabilities) 
        external 
        payable 
        override 
    {
        require(msg.value >= MIN_STAKE, "Insufficient stake");
        require(!agents[msg.sender].isActive, "Agent already registered");
        require(capabilities.length > 0, "Must have at least one capability");
        
        agents[msg.sender] = Agent({
            walletAddress: msg.sender,
            reputationScore: 100, // Start with base reputation
            stakedAmount: msg.value,
            isActive: true,
            capabilities: capabilities,
            lastActiveTimestamp: block.timestamp,
            tasksCompleted: 0,
            successRate: 0
        });
        
        agentStakes[msg.sender] = msg.value;
        
        emit AgentRegistered(msg.sender, capabilities, msg.value);
    }
    
    /**
     * @dev Create a new task for the swarm
     * @param description Task description
     * @param requiredCapabilities Required agent capabilities
     * @param deadline Task deadline timestamp
     */
    function createTask(
        string memory description,
        string[] memory requiredCapabilities,
        uint256 deadline
    ) external payable override returns (string memory) {
        require(msg.value > 0, "Must provide bounty");
        require(deadline > block.timestamp, "Invalid deadline");
        require(bytes(description).length > 0, "Empty description");
        
        taskIdCounter.increment();
        string memory taskId = string(abi.encodePacked("TASK-", uint2str(taskIdCounter.current())));
        
        tasks[taskId] = Task({
            id: taskId,
            requester: msg.sender,
            description: description,
            bounty: msg.value,
            deadline: deadline,
            status: TaskStatus.Open,
            requiredCapabilities: requiredCapabilities,
            solutionHash: "",
            consensusThreshold: 66 // 66% consensus required
        });
        
        emit TaskCreated(taskId, msg.sender, msg.value);
        
        return taskId;
    }
    
    /**
     * @dev Assign agents to a task based on bidding
     * @param taskId Task identifier
     * @param selectedAgents Addresses of selected agents
     */
    function assignTask(
        string memory taskId,
        address[] memory selectedAgents
    ) external override {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.Open, "Task not open");
        require(selectedAgents.length > 0 && selectedAgents.length <= MAX_AGENTS_PER_TASK, "Invalid agent count");
        
        // Verify all agents are eligible
        for (uint i = 0; i < selectedAgents.length; i++) {
            require(agents[selectedAgents[i]].isActive, "Agent not active");
            require(hasRequiredCapabilities(selectedAgents[i], task.requiredCapabilities), "Agent lacks capabilities");
        }
        
        task.status = TaskStatus.InProgress;
        taskAssignments[taskId] = selectedAgents;
        
        // Update agent's active tasks
        for (uint i = 0; i < selectedAgents.length; i++) {
            agentActiveTasks[selectedAgents[i]].push(taskId);
        }
        
        emit TaskAssigned(taskId, selectedAgents);
    }
    
    /**
     * @dev Submit a solution for consensus
     * @param taskId Task identifier
     * @param solutionHash IPFS hash of the solution
     */
    function submitSolution(
        string memory taskId,
        string memory solutionHash
    ) external override onlyRegisteredAgent {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.InProgress, "Task not in progress");
        require(isAssignedToTask(msg.sender, taskId), "Not assigned to task");
        require(bytes(solutionHash).length > 0, "Empty solution");
        
        // In a full implementation, this would trigger consensus mechanism
        task.solutionHash = solutionHash;
        task.status = TaskStatus.UnderReview;
        
        emit SolutionSubmitted(taskId, solutionHash);
    }
    
    /**
     * @dev Finalize task after consensus
     * @param taskId Task identifier
     * @param finalSolution Consensus solution hash
     */
    function finalizeTask(
        string memory taskId,
        string memory finalSolution
    ) external override {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.UnderReview, "Task not under review");
        
        task.status = TaskStatus.Completed;
        task.solutionHash = finalSolution;
        
        // Distribute rewards
        distributeRewards(taskId);
        
        emit ConsensusReached(taskId, finalSolution);
    }
    
    /**
     * @dev Update agent reputation (called by reputation oracle)
     * @param agent Agent address
     * @param newScore New reputation score
     */
    function updateReputation(
        address agent,
        uint256 newScore
    ) external override {
        require(msg.sender == reputationOracle, "Only oracle can update");
        require(agents[agent].isActive, "Agent not active");
        
        agents[agent].reputationScore = newScore;
        agents[agent].lastActiveTimestamp = block.timestamp;
    }
    
    /**
     * @dev Slash an agent for malicious behavior
     * @param agent Agent address
     * @param amount Amount to slash
     * @param reason Slashing reason
     */
    function slashAgent(
        address agent,
        uint256 amount,
        string memory reason
    ) external override onlyOwner {
        require(agents[agent].isActive, "Agent not active");
        require(amount <= agentStakes[agent], "Slash exceeds stake");
        
        agentStakes[agent] -= amount;
        agents[agent].stakedAmount -= amount;
        
        // Deactivate if stake below minimum
        if (agentStakes[agent] < MIN_STAKE) {
            agents[agent].isActive = false;
        }
        
        emit AgentSlashed(agent, amount, reason);
    }
    
    /**
     * @dev Set the reputation oracle address
     * @param oracle Oracle contract address
     */
    function setReputationOracle(address oracle) external onlyOwner {
        require(oracle != address(0), "Invalid address");
        reputationOracle = oracle;
    }
    
    /**
     * @dev Set the evolution engine address
     * @param engine Evolution engine contract address
     */
    function setEvolutionEngine(address engine) external onlyOwner {
        require(engine != address(0), "Invalid address");
        evolutionEngine = engine;
    }
    
    /**
     * @dev Get agent information
     * @param agent Agent address
     */
    function getAgent(address agent) external view returns (Agent memory) {
        return agents[agent];
    }
    
    /**
     * @dev Get task information
     * @param taskId Task identifier
     */
    function getTask(string memory taskId) external view returns (Task memory) {
        return tasks[taskId];
    }
    
    /**
     * @dev Get agents assigned to a task
     * @param taskId Task identifier
     */
    function getTaskAssignments(string memory taskId) external view returns (address[] memory) {
        return taskAssignments[taskId];
    }
    
    // Internal functions
    
    function hasRequiredCapabilities(
        address agent,
        string[] memory required
    ) internal view returns (bool) {
        string[] memory agentCaps = agents[agent].capabilities;
        
        for (uint i = 0; i < required.length; i++) {
            bool found = false;
            for (uint j = 0; j < agentCaps.length; j++) {
                if (keccak256(bytes(agentCaps[j])) == keccak256(bytes(required[i]))) {
                    found = true;
                    break;
                }
            }
            if (!found) return false;
        }
        return true;
    }
    
    function isAssignedToTask(
        address agent,
        string memory taskId
    ) internal view returns (bool) {
        address[] memory assigned = taskAssignments[taskId];
        for (uint i = 0; i < assigned.length; i++) {
            if (assigned[i] == agent) return true;
        }
        return false;
    }
    
    function distributeRewards(string memory taskId) internal {
        Task storage task = tasks[taskId];
        address[] memory assignedAgents = taskAssignments[taskId];
        uint256[] memory rewards = new uint256[](assignedAgents.length);
        
        uint256 totalReputation = 0;
        for (uint i = 0; i < assignedAgents.length; i++) {
            totalReputation += agents[assignedAgents[i]].reputationScore;
        }
        
        // Distribute rewards proportional to reputation
        for (uint i = 0; i < assignedAgents.length; i++) {
            uint256 agentShare = (task.bounty * agents[assignedAgents[i]].reputationScore) / totalReputation;
            rewards[i] = agentShare;
            
            // Transfer reward
            payable(assignedAgents[i]).transfer(agentShare);
            
            // Update agent stats
            agents[assignedAgents[i]].tasksCompleted++;
        }
        
        emit RewardsDistributed(taskId, assignedAgents, rewards);
    }
    
    function uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 length;
        while (j != 0) {
            length++;
            j /= 10;
        }
        bytes memory bstr = new bytes(length);
        uint256 k = length;
        while (_i != 0) {
            k = k-1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
}