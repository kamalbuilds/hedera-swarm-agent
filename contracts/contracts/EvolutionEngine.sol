// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IHederaTokenService.sol";

/**
 * @title EvolutionEngine
 * @dev Manages agent DNA as NFTs with genetic programming capabilities
 */
contract EvolutionEngine is ERC721, ERC721URIStorage, Ownable {
    uint256 private _tokenIdCounter;
    
    struct AgentDNA {
        uint256 generation;
        uint256[] parentIds;
        mapping(string => Trait) traits;
        string[] traitKeys;
        uint256 fitness;
        uint256 birthBlock;
        address creator;
    }
    
    struct Trait {
        string name;
        string traitType; // capability, parameter, behavior
        bytes value;
        uint256 mutability; // 0-100, likelihood to mutate
        uint256 dominance; // For crossbreeding
    }
    
    struct EvolutionParams {
        uint256 mutationRate;
        uint256 crossbreedCooldown;
        uint256 minFitnessForBreeding;
        uint256 maxGenerations;
    }
    
    // State variables
    mapping(uint256 => AgentDNA) public agentDNAs;
    mapping(uint256 => uint256) public lastBreedTime;
    mapping(address => uint256[]) public ownerTokens;
    mapping(string => bool) public registeredTraits;
    
    EvolutionParams public evolutionParams;
    address public swarmOrchestrator;
    
    uint256 public constant BREEDING_FEE = 1 * 10**8; // 1 HBAR
    uint256 public constant MUTATION_PROBABILITY_SCALE = 100;
    
    // Events
    event DNAMinted(uint256 indexed tokenId, address creator, uint256 generation);
    event DNAMutated(uint256 indexed originalId, uint256 newId, string[] mutatedTraits);
    event DNACrossbred(uint256 indexed parentA, uint256 indexed parentB, uint256 offspringId);
    event TraitRegistered(string traitName, string traitType);
    event FitnessUpdated(uint256 indexed tokenId, uint256 oldFitness, uint256 newFitness);
    
    constructor(address _swarmOrchestrator) 
        ERC721("HederaSwarm Agent DNA", "HSDNA") 
        Ownable(msg.sender) 
    {
        swarmOrchestrator = _swarmOrchestrator;
        
        // Set default evolution parameters
        evolutionParams = EvolutionParams({
            mutationRate: 10, // 10%
            crossbreedCooldown: 7 days,
            minFitnessForBreeding: 70,
            maxGenerations: 100
        });
        
        // Register base traits
        _registerBasicTraits();
    }
    
    /**
     * @dev Mint a new agent DNA NFT
     * @param traits Initial traits for the agent
     * @param traitValues Encoded values for each trait
     * @param uri Metadata URI (IPFS hash)
     */
    function mintAgentDNA(
        string[] memory traits,
        bytes[] memory traitValues,
        string memory uri
    ) external returns (uint256) {
        require(traits.length == traitValues.length, "Trait mismatch");
        require(traits.length > 0, "No traits provided");
        
        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;
        
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, uri);
        
        // Initialize DNA
        AgentDNA storage dna = agentDNAs[tokenId];
        dna.generation = 1;
        dna.fitness = 50; // Base fitness
        dna.birthBlock = block.number;
        dna.creator = msg.sender;
        
        // Set traits
        for (uint i = 0; i < traits.length; i++) {
            require(registeredTraits[traits[i]], "Unregistered trait");
            dna.traits[traits[i]] = Trait({
                name: traits[i],
                traitType: "capability",
                value: traitValues[i],
                mutability: 20,
                dominance: 50
            });
            dna.traitKeys.push(traits[i]);
        }
        
        ownerTokens[msg.sender].push(tokenId);
        
        emit DNAMinted(tokenId, msg.sender, 1);
        
        return tokenId;
    }
    
    /**
     * @dev Mutate an existing DNA to create a new variant
     * @param tokenId Token to mutate
     */
    function mutate(uint256 tokenId) external payable returns (uint256) {
        require(ownerOf(tokenId) == msg.sender, "Not DNA owner");
        require(msg.value >= BREEDING_FEE, "Insufficient fee");
        
        AgentDNA storage originalDNA = agentDNAs[tokenId];
        require(originalDNA.generation < evolutionParams.maxGenerations, "Max generations reached");
        
        _tokenIdCounter++;
        uint256 newTokenId = _tokenIdCounter;
        
        _safeMint(msg.sender, newTokenId);
        
        // Create mutated DNA
        AgentDNA storage mutatedDNA = agentDNAs[newTokenId];
        mutatedDNA.generation = originalDNA.generation + 1;
        mutatedDNA.parentIds = new uint256[](1);
        mutatedDNA.parentIds[0] = tokenId;
        mutatedDNA.fitness = originalDNA.fitness;
        mutatedDNA.birthBlock = block.number;
        mutatedDNA.creator = msg.sender;
        
        string[] memory mutatedTraits = new string[](originalDNA.traitKeys.length);
        uint mutationCount = 0;
        
        // Copy and potentially mutate traits
        for (uint i = 0; i < originalDNA.traitKeys.length; i++) {
            string memory traitKey = originalDNA.traitKeys[i];
            Trait memory originalTrait = originalDNA.traits[traitKey];
            
            mutatedDNA.traitKeys.push(traitKey);
            
            // Check if trait mutates
            if (_shouldMutate(originalTrait.mutability)) {
                mutatedDNA.traits[traitKey] = _mutateTrait(originalTrait);
                mutatedTraits[mutationCount] = traitKey;
                mutationCount++;
            } else {
                mutatedDNA.traits[traitKey] = originalTrait;
            }
        }
        
        // Potentially add new trait
        if (_random() % 100 < 5) { // 5% chance
            _addRandomTrait(mutatedDNA);
        }
        
        ownerTokens[msg.sender].push(newTokenId);
        
        emit DNAMutated(tokenId, newTokenId, mutatedTraits);
        
        return newTokenId;
    }
    
    /**
     * @dev Crossbreed two DNA tokens to create offspring
     * @param parentA First parent token ID
     * @param parentB Second parent token ID
     */
    function crossbreed(uint256 parentA, uint256 parentB) 
        external 
        payable 
        returns (uint256) 
    {
        require(ownerOf(parentA) == msg.sender || ownerOf(parentB) == msg.sender, "Must own at least one parent");
        require(parentA != parentB, "Cannot self-breed");
        require(msg.value >= BREEDING_FEE * 2, "Insufficient fee");
        
        // Check breeding cooldown
        require(
            block.timestamp >= lastBreedTime[parentA] + evolutionParams.crossbreedCooldown &&
            block.timestamp >= lastBreedTime[parentB] + evolutionParams.crossbreedCooldown,
            "Breeding cooldown active"
        );
        
        AgentDNA storage dnaA = agentDNAs[parentA];
        AgentDNA storage dnaB = agentDNAs[parentB];
        
        // Check fitness requirements
        require(
            dnaA.fitness >= evolutionParams.minFitnessForBreeding &&
            dnaB.fitness >= evolutionParams.minFitnessForBreeding,
            "Insufficient fitness"
        );
        
        _tokenIdCounter++;
        uint256 offspringId = _tokenIdCounter;
        
        _safeMint(msg.sender, offspringId);
        
        // Create offspring DNA
        AgentDNA storage offspring = agentDNAs[offspringId];
        offspring.generation = (dnaA.generation + dnaB.generation) / 2 + 1;
        offspring.parentIds = new uint256[](2);
        offspring.parentIds[0] = parentA;
        offspring.parentIds[1] = parentB;
        offspring.fitness = (dnaA.fitness + dnaB.fitness) / 2;
        offspring.birthBlock = block.number;
        offspring.creator = msg.sender;
        
        // Combine traits from both parents
        _combineTraits(offspring, dnaA, dnaB);
        
        // Update breeding timestamps
        lastBreedTime[parentA] = block.timestamp;
        lastBreedTime[parentB] = block.timestamp;
        
        ownerTokens[msg.sender].push(offspringId);
        
        emit DNACrossbred(parentA, parentB, offspringId);
        
        return offspringId;
    }
    
    /**
     * @dev Update fitness score for a DNA token (called by SwarmOrchestrator)
     * @param tokenId Token to update
     * @param newFitness New fitness score
     */
    function updateFitness(uint256 tokenId, uint256 newFitness) external {
        require(msg.sender == swarmOrchestrator, "Only orchestrator");
        require(newFitness <= 100, "Invalid fitness");
        
        uint256 oldFitness = agentDNAs[tokenId].fitness;
        agentDNAs[tokenId].fitness = newFitness;
        
        emit FitnessUpdated(tokenId, oldFitness, newFitness);
    }
    
    /**
     * @dev Get DNA information
     * @param tokenId Token to query
     */
    function getDNA(uint256 tokenId) external view returns (
        uint256 generation,
        uint256[] memory parentIds,
        string[] memory traitKeys,
        uint256 fitness,
        address creator
    ) {
        AgentDNA storage dna = agentDNAs[tokenId];
        return (
            dna.generation,
            dna.parentIds,
            dna.traitKeys,
            dna.fitness,
            dna.creator
        );
    }
    
    /**
     * @dev Get specific trait value
     * @param tokenId Token to query
     * @param traitName Name of the trait
     */
    function getTrait(uint256 tokenId, string memory traitName) 
        external 
        view 
        returns (Trait memory) 
    {
        return agentDNAs[tokenId].traits[traitName];
    }
    
    // Internal functions
    
    function _registerBasicTraits() internal {
        string[10] memory basicTraits = [
            "reasoning",
            "learning_rate",
            "memory_capacity",
            "collaboration_affinity",
            "risk_tolerance",
            "creativity_index",
            "processing_speed",
            "pattern_recognition",
            "language_proficiency",
            "domain_expertise"
        ];
        
        for (uint i = 0; i < basicTraits.length; i++) {
            registeredTraits[basicTraits[i]] = true;
            emit TraitRegistered(basicTraits[i], "parameter");
        }
    }
    
    function _shouldMutate(uint256 mutability) internal view returns (bool) {
        return _random() % MUTATION_PROBABILITY_SCALE < mutability;
    }
    
    function _mutateTrait(Trait memory original) internal view returns (Trait memory) {
        Trait memory mutated = original;
        
        // Simple mutation: slightly modify the value
        // In production, this would be more sophisticated
        bytes memory newValue = new bytes(original.value.length);
        for (uint i = 0; i < original.value.length; i++) {
            newValue[i] = bytes1(uint8(original.value[i]) ^ uint8(_random() % 16));
        }
        mutated.value = newValue;
        
        return mutated;
    }
    
    function _combineTraits(
        AgentDNA storage offspring,
        AgentDNA storage parentA,
        AgentDNA storage parentB
    ) internal {
        // Combine traits from both parents
        for (uint i = 0; i < parentA.traitKeys.length; i++) {
            string memory traitKey = parentA.traitKeys[i];
            Trait memory traitA = parentA.traits[traitKey];
            Trait memory traitB = parentB.traits[traitKey];
            
            // Select trait based on dominance
            if (traitA.dominance >= traitB.dominance) {
                offspring.traits[traitKey] = traitA;
            } else {
                offspring.traits[traitKey] = traitB;
            }
            
            offspring.traitKeys.push(traitKey);
        }
        
        // Add any unique traits from parent B
        for (uint i = 0; i < parentB.traitKeys.length; i++) {
            string memory traitKey = parentB.traitKeys[i];
            if (offspring.traits[traitKey].dominance == 0) {
                offspring.traits[traitKey] = parentB.traits[traitKey];
                offspring.traitKeys.push(traitKey);
            }
        }
    }
    
    function _addRandomTrait(AgentDNA storage dna) internal {
        // Simplified random trait addition
        string memory newTrait = "adaptive_behavior";
        if (!registeredTraits[newTrait]) {
            registeredTraits[newTrait] = true;
        }
        
        dna.traits[newTrait] = Trait({
            name: newTrait,
            traitType: "behavior",
            value: abi.encodePacked(_random()),
            mutability: 30,
            dominance: 40
        });
        dna.traitKeys.push(newTrait);
    }
    
    function _random() internal view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender)));
    }
    
    // Override functions
    
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}