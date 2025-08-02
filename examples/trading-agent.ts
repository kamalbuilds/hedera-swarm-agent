import { SwarmAgent, CAPABILITIES } from '../agent-sdk/src';
import { KnowledgeGraph } from '../knowledge-graph/src';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Example: Market Trading Agent
 * This agent specializes in market analysis and trading decisions
 */
class TradingAgent extends SwarmAgent {
  private knowledgeGraph: KnowledgeGraph;
  private tradingHistory: Array<{
    timestamp: Date;
    action: 'buy' | 'sell' | 'hold';
    asset: string;
    amount: number;
    price: number;
    reason: string;
  }> = [];
  
  constructor(config: any) {
    super({
      ...config,
      capabilities: [
        CAPABILITIES.FINANCIAL_ANALYSIS,
        CAPABILITIES.MARKET_PREDICTION,
        CAPABILITIES.DATA_ANALYSIS,
        CAPABILITIES.MACHINE_LEARNING
      ]
    });
    
    this.knowledgeGraph = new KnowledgeGraph({
      client: this.client,
      topicId: config.swarmTopics.knowledge,
      agentId: config.accountId
    });
  }
  
  async analyzeMarket(asset: string): Promise<any> {
    console.log(`📊 Analyzing market for ${asset}...`);
    
    // Search knowledge graph for relevant market data
    const marketKnowledge = await this.knowledgeGraph.semanticSearch(
      `${asset} market trends price analysis`,
      { limit: 10, minConfidence: 0.7 }
    );
    
    // Use AI to analyze market conditions
    const analysis = await this.callAI({
      messages: [
        {
          role: 'system',
          content: 'You are a financial market analyst specializing in cryptocurrency and DeFi markets.'
        },
        {
          role: 'user',
          content: `Analyze the market conditions for ${asset}. Consider:
            1. Recent price trends
            2. Trading volume patterns
            3. Market sentiment
            4. Technical indicators
            5. Fundamental factors
            
            Knowledge base: ${JSON.stringify(marketKnowledge[0]?.nodes || [])}
            
            Provide a structured analysis with buy/sell/hold recommendation.`
        }
      ]
    });
    
    // Store analysis in knowledge graph
    const analysisNode = await this.knowledgeGraph.addNode({
      type: 'fact',
      content: {
        asset,
        analysis: analysis.content,
        timestamp: new Date(),
        indicators: {
          sentiment: analysis.sentiment || 'neutral',
          trend: analysis.trend || 'sideways',
          volume: analysis.volume || 'normal'
        }
      },
      metadata: {
        createdBy: this.config.accountId,
        createdAt: new Date(),
        lastModified: new Date(),
        confidence: 0.85,
        sources: ['market-analysis'],
        tags: ['trading', asset, 'analysis']
      }
    });
    
    return {
      asset,
      recommendation: analysis.recommendation || 'hold',
      confidence: analysis.confidence || 0.5,
      analysis: analysis.content,
      nodeId: analysisNode.id
    };
  }
  
  async executeTrade(params: {
    action: 'buy' | 'sell';
    asset: string;
    amount: number;
    reason: string;
  }): Promise<void> {
    console.log(`💰 Executing ${params.action} order for ${params.amount} ${params.asset}`);
    
    // In a real implementation, this would interact with a DEX or CEX
    const mockPrice = Math.random() * 1000 + 100;
    
    this.tradingHistory.push({
      timestamp: new Date(),
      action: params.action,
      asset: params.asset,
      amount: params.amount,
      price: mockPrice,
      reason: params.reason
    });
    
    // Record trade in knowledge graph
    await this.knowledgeGraph.addNode({
      type: 'fact',
      content: {
        trade: {
          action: params.action,
          asset: params.asset,
          amount: params.amount,
          price: mockPrice,
          timestamp: new Date()
        },
        reason: params.reason
      },
      metadata: {
        createdBy: this.config.accountId,
        createdAt: new Date(),
        lastModified: new Date(),
        confidence: 1.0,
        sources: ['trade-execution'],
        tags: ['trading', 'execution', params.asset]
      }
    });
    
    console.log(`✅ Trade executed at $${mockPrice}`);
  }
  
  async handleTradingTask(task: any): Promise<any> {
    const { asset, strategy, riskLevel } = task.metadata;
    
    console.log(`\n🤖 Trading Agent processing task: ${task.title}`);
    console.log(`   Asset: ${asset}`);
    console.log(`   Strategy: ${strategy}`);
    console.log(`   Risk Level: ${riskLevel}`);
    
    // Analyze market
    const marketAnalysis = await this.analyzeMarket(asset);
    
    // Make trading decision based on analysis and risk level
    let action: 'buy' | 'sell' | 'hold' = 'hold';
    let amount = 0;
    
    if (marketAnalysis.recommendation === 'buy' && marketAnalysis.confidence > 0.7) {
      action = 'buy';
      amount = riskLevel === 'high' ? 1000 : riskLevel === 'medium' ? 500 : 100;
    } else if (marketAnalysis.recommendation === 'sell' && marketAnalysis.confidence > 0.7) {
      action = 'sell';
      amount = 1000; // Sell all holdings
    }
    
    // Execute trade if needed
    if (action !== 'hold') {
      await this.executeTrade({
        action,
        asset,
        amount,
        reason: marketAnalysis.analysis
      });
    }
    
    // Generate report
    const report = {
      asset,
      marketAnalysis: marketAnalysis.analysis,
      recommendation: marketAnalysis.recommendation,
      confidence: marketAnalysis.confidence,
      action,
      amount,
      tradingHistory: this.tradingHistory.filter(t => t.asset === asset).slice(-10)
    };
    
    return {
      success: true,
      report,
      knowledgeNodeId: marketAnalysis.nodeId
    };
  }
  
  getPerformanceMetrics(): any {
    const totalTrades = this.tradingHistory.length;
    const profitableTrades = this.tradingHistory.filter(t => {
      // Simplified P&L calculation
      return t.action === 'sell' && t.price > 500;
    }).length;
    
    return {
      totalTrades,
      profitableTrades,
      winRate: totalTrades > 0 ? profitableTrades / totalTrades : 0,
      recentTrades: this.tradingHistory.slice(-5)
    };
  }
}

// Example usage
async function main() {
  const trader = new TradingAgent({
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
  
  await trader.initialize();
  await trader.joinSwarm();
  
  // Example trading task
  const tradingTask = {
    id: 'trade-hbar-001',
    title: 'HBAR Market Analysis and Trading',
    description: 'Analyze HBAR market conditions and execute appropriate trades',
    reward: 50,
    capabilities: ['FINANCIAL_ANALYSIS', 'MARKET_PREDICTION'],
    timeLimit: 3600,
    metadata: {
      asset: 'HBAR',
      strategy: 'momentum',
      riskLevel: 'medium'
    }
  };
  
  const result = await trader.handleTradingTask(tradingTask);
  console.log('\n📈 Trading Task Result:', JSON.stringify(result, null, 2));
  
  const metrics = trader.getPerformanceMetrics();
  console.log('\n📊 Performance Metrics:', JSON.stringify(metrics, null, 2));
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { TradingAgent };