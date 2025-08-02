import { SwarmAgent, CAPABILITIES } from '../agent-sdk/src';
import { KnowledgeGraph } from '../knowledge-graph/src';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Example: Security Audit Agent
 * This agent specializes in smart contract security analysis
 */
class SecurityAgent extends SwarmAgent {
  private knowledgeGraph: KnowledgeGraph;
  private vulnerabilityDatabase: Map<string, any> = new Map();
  
  constructor(config: any) {
    super({
      ...config,
      capabilities: [
        CAPABILITIES.SMART_CONTRACT_ANALYSIS,
        CAPABILITIES.SECURITY_ANALYSIS,
        CAPABILITIES.TRANSACTION_ANALYSIS
      ]
    });
    
    this.knowledgeGraph = new KnowledgeGraph({
      client: this.client,
      topicId: config.swarmTopics.knowledge,
      agentId: config.accountId
    });
    
    this.initializeVulnerabilityDatabase();
  }
  
  private initializeVulnerabilityDatabase() {
    // Common vulnerability patterns
    this.vulnerabilityDatabase.set('reentrancy', {
      pattern: /\.call\{.*value:.*\}\(/,
      severity: 'critical',
      description: 'Potential reentrancy vulnerability detected'
    });
    
    this.vulnerabilityDatabase.set('overflow', {
      pattern: /\+|\-|\*/,
      severity: 'high',
      description: 'Potential integer overflow/underflow'
    });
    
    this.vulnerabilityDatabase.set('unchecked-call', {
      pattern: /\.call\(/,
      severity: 'medium',
      description: 'Unchecked external call return value'
    });
  }
  
  async analyzeContract(contractCode: string, contractAddress?: string): Promise<any> {
    console.log(`🔍 Analyzing smart contract${contractAddress ? ` at ${contractAddress}` : ''}...`);
    
    // Search for known vulnerabilities in knowledge graph
    const knownVulnerabilities = await this.knowledgeGraph.semanticSearch(
      'smart contract vulnerabilities security audit',
      { limit: 20, minConfidence: 0.6 }
    );
    
    // Use AI for comprehensive analysis
    const aiAnalysis = await this.callAI({
      messages: [
        {
          role: 'system',
          content: `You are a smart contract security auditor. Analyze the following contract for:
            1. Security vulnerabilities (reentrancy, overflow, access control, etc.)
            2. Gas optimization opportunities
            3. Best practice violations
            4. Potential attack vectors
            Provide a detailed security report.`
        },
        {
          role: 'user',
          content: `Contract code:\n\n${contractCode}\n\nKnown vulnerabilities context: ${JSON.stringify(knownVulnerabilities[0]?.nodes || [])}`
        }
      ]
    });
    
    // Pattern-based vulnerability detection
    const detectedVulnerabilities = [];
    for (const [vulnType, vulnData] of this.vulnerabilityDatabase) {
      if (vulnData.pattern.test(contractCode)) {
        detectedVulnerabilities.push({
          type: vulnType,
          severity: vulnData.severity,
          description: vulnData.description
        });
      }
    }
    
    // Store findings in knowledge graph
    const auditNode = await this.knowledgeGraph.addNode({
      type: 'fact',
      content: {
        contractAddress,
        auditTimestamp: new Date(),
        vulnerabilities: detectedVulnerabilities,
        aiFindings: aiAnalysis.findings || [],
        recommendations: aiAnalysis.recommendations || [],
        gasOptimizations: aiAnalysis.gasOptimizations || [],
        overallRisk: aiAnalysis.riskLevel || 'medium'
      },
      metadata: {
        createdBy: this.config.accountId,
        createdAt: new Date(),
        lastModified: new Date(),
        confidence: 0.9,
        sources: ['security-audit'],
        tags: ['security', 'audit', 'smart-contract']
      }
    });
    
    return {
      contractAddress,
      vulnerabilities: detectedVulnerabilities,
      aiFindings: aiAnalysis.findings || [],
      recommendations: aiAnalysis.recommendations || [],
      gasOptimizations: aiAnalysis.gasOptimizations || [],
      overallRisk: aiAnalysis.riskLevel || 'medium',
      auditNodeId: auditNode.id
    };
  }
  
  async monitorTransaction(txHash: string): Promise<any> {
    console.log(`📡 Monitoring transaction: ${txHash}`);
    
    // In a real implementation, this would fetch transaction data from Hedera
    const mockTxData = {
      from: '0x1234...',
      to: '0x5678...',
      value: '1000000000000000000',
      data: '0xa9059cbb...',
      gasUsed: 21000
    };
    
    // Analyze transaction for suspicious patterns
    const analysis = await this.callAI({
      messages: [
        {
          role: 'system',
          content: 'You are a blockchain transaction analyst. Identify any suspicious patterns or potential security risks.'
        },
        {
          role: 'user',
          content: `Analyze this transaction: ${JSON.stringify(mockTxData)}`
        }
      ]
    });
    
    // Check against known malicious addresses
    const maliciousCheck = await this.knowledgeGraph.semanticSearch(
      `malicious address ${mockTxData.to}`,
      { limit: 5, minConfidence: 0.8 }
    );
    
    const isSuspicious = maliciousCheck.length > 0 || analysis.riskScore > 0.7;
    
    // Store transaction analysis
    await this.knowledgeGraph.addNode({
      type: 'fact',
      content: {
        txHash,
        txData: mockTxData,
        analysis: analysis.content,
        riskScore: analysis.riskScore || 0.2,
        isSuspicious,
        flags: analysis.flags || []
      },
      metadata: {
        createdBy: this.config.accountId,
        createdAt: new Date(),
        lastModified: new Date(),
        confidence: 0.85,
        sources: ['transaction-monitor'],
        tags: ['security', 'transaction', isSuspicious ? 'suspicious' : 'safe']
      }
    });
    
    return {
      txHash,
      isSuspicious,
      riskScore: analysis.riskScore || 0.2,
      analysis: analysis.content,
      recommendations: isSuspicious ? ['Block transaction', 'Alert user'] : ['Transaction appears safe']
    };
  }
  
  async handleSecurityTask(task: any): Promise<any> {
    const { type, target } = task.metadata;
    
    console.log(`\n🛡️ Security Agent processing task: ${task.title}`);
    console.log(`   Type: ${type}`);
    console.log(`   Target: ${target}`);
    
    let result;
    
    switch (type) {
      case 'contract-audit':
        // In real implementation, fetch contract code from chain
        const mockContractCode = `
          pragma solidity ^0.8.0;
          contract VulnerableContract {
            mapping(address => uint) balances;
            function withdraw() external {
              uint amount = balances[msg.sender];
              (bool success, ) = msg.sender.call{value: amount}("");
              require(success);
              balances[msg.sender] = 0;
            }
          }
        `;
        result = await this.analyzeContract(mockContractCode, target);
        break;
        
      case 'transaction-monitor':
        result = await this.monitorTransaction(target);
        break;
        
      case 'threat-analysis':
        // Analyze broader security threats
        const threatAnalysis = await this.knowledgeGraph.semanticSearch(
          `security threats ${target}`,
          { limit: 10, minConfidence: 0.7 }
        );
        
        result = {
          threats: threatAnalysis,
          recommendations: ['Enable multi-sig', 'Regular audits', 'Monitor suspicious activity']
        };
        break;
        
      default:
        throw new Error(`Unknown security task type: ${type}`);
    }
    
    return {
      success: true,
      taskType: type,
      target,
      result,
      timestamp: new Date()
    };
  }
  
  async generateSecurityReport(): Promise<any> {
    // Query knowledge graph for recent security findings
    const recentFindings = await this.knowledgeGraph.semanticSearch(
      'security audit findings vulnerabilities',
      {
        limit: 50,
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        tags: ['security']
      }
    );
    
    // Aggregate findings
    const vulnerabilityCount = recentFindings.reduce((acc, result) => {
      result.nodes.forEach(node => {
        if (node.content.vulnerabilities) {
          acc += node.content.vulnerabilities.length;
        }
      });
      return acc;
    }, 0);
    
    return {
      reportDate: new Date(),
      totalAudits: recentFindings.length,
      vulnerabilitiesFound: vulnerabilityCount,
      criticalIssues: recentFindings.filter(r => 
        r.nodes.some(n => n.content.overallRisk === 'critical')
      ).length,
      recommendations: [
        'Implement automated security monitoring',
        'Regular security training for developers',
        'Establish bug bounty program'
      ]
    };
  }
}

// Example usage
async function main() {
  const securityAgent = new SecurityAgent({
    accountId: process.env.HEDERA_ACCOUNT_ID!,
    privateKey: process.env.HEDERA_PRIVATE_KEY!,
    network: 'testnet',
    aiModel: 'gpt-4',
    aiApiKey: process.env.OPENAI_API_KEY,
    swarmTopics: {
      tasks: process.env.SWARM_TASK_TOPIC!,
      consensus: process.env.SWARM_CONSENSUS_TOPIC!,
      knowledge: process.env.SWARM_KNOWLEDGE_TOPIC!
    },
    orchestratorAddress: process.env.SWARM_ORCHESTRATOR_ADDRESS!
  });
  
  await securityAgent.initialize();
  await securityAgent.joinSwarm();
  
  // Example security audit task
  const auditTask = {
    id: 'audit-001',
    title: 'Smart Contract Security Audit',
    description: 'Perform comprehensive security audit on DeFi contract',
    reward: 100,
    capabilities: ['SMART_CONTRACT_ANALYSIS', 'SECURITY_ANALYSIS'],
    timeLimit: 7200,
    metadata: {
      type: 'contract-audit',
      target: '0x1234567890abcdef'
    }
  };
  
  const result = await securityAgent.handleSecurityTask(auditTask);
  console.log('\n🔒 Security Audit Result:', JSON.stringify(result, null, 2));
  
  const report = await securityAgent.generateSecurityReport();
  console.log('\n📊 Weekly Security Report:', JSON.stringify(report, null, 2));
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { SecurityAgent };