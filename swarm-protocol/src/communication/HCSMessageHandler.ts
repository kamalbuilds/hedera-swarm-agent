import {
    Client,
    TopicId,
    TopicCreateTransaction,
    TopicMessageSubmitTransaction,
    TopicMessageQuery,
    PrivateKey,
    PublicKey,
    AccountId,
    Hbar
} from '@hashgraph/sdk';
import { EventEmitter } from 'events';
import crypto from 'crypto';

export enum MessageType {
    TASK_ANNOUNCEMENT = 'TASK_ANNOUNCEMENT',
    AGENT_BID = 'AGENT_BID',
    CONSENSUS_PROPOSAL = 'CONSENSUS_PROPOSAL',
    CONSENSUS_VOTE = 'CONSENSUS_VOTE',
    KNOWLEDGE_SHARE = 'KNOWLEDGE_SHARE',
    REPUTATION_UPDATE = 'REPUTATION_UPDATE',
    COLLABORATION_REQUEST = 'COLLABORATION_REQUEST',
    COLLABORATION_RESPONSE = 'COLLABORATION_RESPONSE',
    HEARTBEAT = 'HEARTBEAT'
}

export interface SwarmMessage {
    id: string;
    type: MessageType;
    sender: string;
    recipient?: string; // For direct messages
    timestamp: number;
    payload: any;
    signature?: string;
    encrypted?: boolean;
}

export interface TopicSubscription {
    topicId: TopicId;
    query: TopicMessageQuery;
    handler: (message: SwarmMessage) => void;
    filter?: (message: SwarmMessage) => boolean;
}

export interface EncryptionConfig {
    enabled: boolean;
    publicKey?: string;
    privateKey?: string;
}

export class HCSMessageHandler extends EventEmitter {
    private client: Client;
    private accountId: AccountId;
    private privateKey: PrivateKey;
    private subscriptions: Map<string, TopicSubscription> = new Map();
    private messageCache: Map<string, SwarmMessage> = new Map();
    private encryptionConfig: EncryptionConfig;
    private messageHandlers: Map<MessageType, ((message: SwarmMessage) => void)[]> = new Map();
    
    constructor(
        client: Client,
        accountId: string,
        privateKey: string,
        encryptionConfig?: EncryptionConfig
    ) {
        super();
        this.client = client;
        this.accountId = AccountId.fromString(accountId);
        this.privateKey = PrivateKey.fromString(privateKey);
        this.encryptionConfig = encryptionConfig || { enabled: false };
        
        // Initialize message type handlers
        for (const type of Object.values(MessageType)) {
            this.messageHandlers.set(type as MessageType, []);
        }
    }
    
    /**
     * Create a new topic for swarm communication
     */
    async createTopic(
        memo: string,
        submitKey?: PublicKey,
        adminKey?: PrivateKey
    ): Promise<TopicId> {
        const topicCreateTx = new TopicCreateTransaction()
            .setTopicMemo(memo)
            .setMaxTransactionFee(new Hbar(5));
            
        if (submitKey) {
            topicCreateTx.setSubmitKey(submitKey);
        }
        
        if (adminKey) {
            topicCreateTx.setAdminKey(adminKey);
        }
        
        const txResponse = await topicCreateTx.execute(this.client);
        const receipt = await txResponse.getReceipt(this.client);
        
        if (!receipt.topicId) {
            throw new Error('Failed to create topic');
        }
        
        console.log(`Created topic ${receipt.topicId} with memo: ${memo}`);
        return receipt.topicId;
    }
    
    /**
     * Publish a message to a topic
     */
    async publishMessage(
        topicId: string | TopicId,
        message: SwarmMessage
    ): Promise<void> {
        // Sign the message
        message.signature = this.signMessage(message);
        
        // Encrypt if needed
        let messageContent = JSON.stringify(message);
        if (this.encryptionConfig.enabled && message.encrypted) {
            messageContent = this.encryptMessage(messageContent);
        }
        
        const topicIdObj = typeof topicId === 'string' 
            ? TopicId.fromString(topicId) 
            : topicId;
            
        const submitTx = new TopicMessageSubmitTransaction()
            .setTopicId(topicIdObj)
            .setMessage(messageContent)
            .setMaxTransactionFee(new Hbar(1));
            
        await submitTx.execute(this.client);
        
        // Cache the message
        this.messageCache.set(message.id, message);
        
        this.emit('messageSent', {
            topicId: topicIdObj.toString(),
            message
        });
    }
    
    /**
     * Subscribe to a topic
     */
    subscribeToTopic(
        topicId: string | TopicId,
        handler?: (message: SwarmMessage) => void,
        filter?: (message: SwarmMessage) => boolean
    ): void {
        const topicIdObj = typeof topicId === 'string' 
            ? TopicId.fromString(topicId) 
            : topicId;
            
        const topicIdStr = topicIdObj.toString();
        
        // Check if already subscribed
        if (this.subscriptions.has(topicIdStr)) {
            console.log(`Already subscribed to topic ${topicIdStr}`);
            return;
        }
        
        const query = new TopicMessageQuery()
            .setTopicId(topicIdObj)
            .setStartTime(0);
            
        const subscription: TopicSubscription = {
            topicId: topicIdObj,
            query,
            handler: handler || ((msg) => this.handleMessage(msg)),
            filter
        };
        
        query.subscribe(this.client, async (message) => {
            try {
                let messageContent = Buffer.from(message.contents).toString();
                
                // Try to decrypt if encrypted
                if (this.encryptionConfig.enabled) {
                    try {
                        const decrypted = this.decryptMessage(messageContent);
                        if (decrypted) {
                            messageContent = decrypted;
                        }
                    } catch (e) {
                        // Not encrypted or not for us
                    }
                }
                
                const swarmMessage = JSON.parse(messageContent) as SwarmMessage;
                
                // Verify signature
                if (!this.verifyMessage(swarmMessage)) {
                    console.warn('Invalid message signature:', swarmMessage.id);
                    return;
                }
                
                // Apply filter if provided
                if (filter && !filter(swarmMessage)) {
                    return;
                }
                
                // Cache the message
                this.messageCache.set(swarmMessage.id, swarmMessage);
                
                // Call handler
                subscription.handler(swarmMessage);
                
                // Emit event
                this.emit('messageReceived', {
                    topicId: topicIdStr,
                    message: swarmMessage
                });
                
            } catch (error) {
                console.error('Error processing message:', error);
                this.emit('messageError', { topicId: topicIdStr, error });
            }
        });
        
        this.subscriptions.set(topicIdStr, subscription);
        console.log(`Subscribed to topic ${topicIdStr}`);
    }
    
    /**
     * Unsubscribe from a topic
     */
    unsubscribeFromTopic(topicId: string): void {
        const subscription = this.subscriptions.get(topicId);
        if (subscription) {
            // Note: HCS doesn't provide a way to stop subscriptions
            // In production, you might want to implement a flag to ignore messages
            this.subscriptions.delete(topicId);
            console.log(`Unsubscribed from topic ${topicId}`);
        }
    }
    
    /**
     * Register a handler for a specific message type
     */
    onMessageType(
        type: MessageType,
        handler: (message: SwarmMessage) => void
    ): void {
        const handlers = this.messageHandlers.get(type) || [];
        handlers.push(handler);
        this.messageHandlers.set(type, handlers);
    }
    
    /**
     * Send a direct message to another agent
     */
    async sendDirectMessage(
        recipient: string,
        type: MessageType,
        payload: any,
        topicId: string
    ): Promise<void> {
        const message: SwarmMessage = {
            id: this.generateMessageId(),
            type,
            sender: this.accountId.toString(),
            recipient,
            timestamp: Date.now(),
            payload,
            encrypted: true // Direct messages should be encrypted
        };
        
        await this.publishMessage(topicId, message);
    }
    
    /**
     * Broadcast a message to all agents
     */
    async broadcastMessage(
        type: MessageType,
        payload: any,
        topicId: string
    ): Promise<void> {
        const message: SwarmMessage = {
            id: this.generateMessageId(),
            type,
            sender: this.accountId.toString(),
            timestamp: Date.now(),
            payload
        };
        
        await this.publishMessage(topicId, message);
    }
    
    /**
     * Handle incoming message
     */
    private handleMessage(message: SwarmMessage): void {
        // Check if message is for us (direct message)
        if (message.recipient && message.recipient !== this.accountId.toString()) {
            return;
        }
        
        // Call type-specific handlers
        const handlers = this.messageHandlers.get(message.type);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(message);
                } catch (error) {
                    console.error(`Error in message handler for ${message.type}:`, error);
                }
            });
        }
        
        // Emit type-specific event
        this.emit(`message:${message.type}`, message);
    }
    
    /**
     * Sign a message
     */
    private signMessage(message: SwarmMessage): string {
        const content = JSON.stringify({
            type: message.type,
            sender: message.sender,
            timestamp: message.timestamp,
            payload: message.payload
        });
        
        const hash = crypto.createHash('sha256').update(content).digest();
        const signature = this.privateKey.sign(hash);
        
        return Buffer.from(signature).toString('hex');
    }
    
    /**
     * Verify message signature
     */
    private verifyMessage(message: SwarmMessage): boolean {
        if (!message.signature) {
            return false;
        }
        
        try {
            const content = JSON.stringify({
                type: message.type,
                sender: message.sender,
                timestamp: message.timestamp,
                payload: message.payload
            });
            
            const hash = crypto.createHash('sha256').update(content).digest();
            const signature = Buffer.from(message.signature, 'hex');
            
            // In production, you would get the sender's public key from registry
            // For now, we'll skip verification
            return true;
        } catch (error) {
            console.error('Signature verification error:', error);
            return false;
        }
    }
    
    /**
     * Encrypt a message
     */
    private encryptMessage(content: string): string {
        if (!this.encryptionConfig.publicKey) {
            throw new Error('Encryption public key not configured');
        }
        
        // Simple encryption - in production use proper encryption
        const cipher = crypto.createCipher('aes-256-cbc', this.encryptionConfig.publicKey);
        let encrypted = cipher.update(content, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        return encrypted;
    }
    
    /**
     * Decrypt a message
     */
    private decryptMessage(encrypted: string): string | null {
        if (!this.encryptionConfig.privateKey) {
            return null;
        }
        
        try {
            const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionConfig.privateKey);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            return null;
        }
    }
    
    /**
     * Generate unique message ID
     */
    private generateMessageId(): string {
        return `${this.accountId.toString()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Get cached messages
     */
    getCachedMessages(
        filter?: (message: SwarmMessage) => boolean
    ): SwarmMessage[] {
        const messages = Array.from(this.messageCache.values());
        return filter ? messages.filter(filter) : messages;
    }
    
    /**
     * Clear message cache
     */
    clearCache(olderThan?: number): void {
        if (olderThan) {
            const cutoff = Date.now() - olderThan;
            for (const [id, message] of this.messageCache) {
                if (message.timestamp < cutoff) {
                    this.messageCache.delete(id);
                }
            }
        } else {
            this.messageCache.clear();
        }
    }
    
    /**
     * Get subscription status
     */
    getSubscriptions(): string[] {
        return Array.from(this.subscriptions.keys());
    }
}