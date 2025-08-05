// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ISwarmOrchestrator
 * @dev Interface for the main SwarmOrchestrator contract
 */
interface ISwarmOrchestrator {
    // Enums
    enum TaskStatus { 
        Open, 
        InProgress, 
        UnderReview, 
        Completed, 
        Disputed,
        Cancelled 
    }
    
    // Structs
    struct Agent {
        address walletAddress;
        uint256 reputationScore;
        uint256 stakedAmount;
        bool isActive;
        string[] capabilities;
        uint256 lastActiveTimestamp;
        uint256 tasksCompleted;
        uint256 successRate;
    }
    
    struct Task {
        string id;
        address requester;
        string description;
        uint256 bounty;
        uint256 deadline;
        TaskStatus status;
        string[] requiredCapabilities;
        string solutionHash;
        uint256 consensusThreshold;
    }
    
    // Functions
    function registerAgent(string[] memory capabilities) external payable;
    
    function createTask(
        string memory description,
        string[] memory requiredCapabilities,
        uint256 deadline
    ) external payable returns (string memory);
    
    function assignTask(
        string memory taskId,
        address[] memory selectedAgents
    ) external;
    
    function submitSolution(
        string memory taskId,
        string memory solutionHash
    ) external;
    
    function finalizeTask(
        string memory taskId,
        string memory finalSolution
    ) external;
    
    function updateReputation(
        address agent,
        uint256 newScore
    ) external;
    
    function slashAgent(
        address agent,
        uint256 amount,
        string memory reason
    ) external;
}