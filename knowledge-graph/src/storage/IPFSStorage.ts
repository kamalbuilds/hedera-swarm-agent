import axios from 'axios';

export class IPFSStorage {
  private endpoint: string;
  
  constructor(endpoint: string = 'https://ipfs.infura.io:5001') {
    this.endpoint = endpoint;
  }
  
  async store(data: any): Promise<string> {
    try {
      const formData = new FormData();
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      formData.append('file', blob);
      
      const response = await axios.post(`${this.endpoint}/api/v0/add`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data.Hash;
    } catch (error) {
      console.error('Failed to store in IPFS:', error);
      throw error;
    }
  }
  
  async retrieve(hash: string): Promise<any> {
    try {
      const response = await axios.get(`${this.endpoint}/api/v0/cat?arg=${hash}`);
      return JSON.parse(response.data);
    } catch (error) {
      console.error('Failed to retrieve from IPFS:', error);
      throw error;
    }
  }
  
  async pin(hash: string): Promise<void> {
    try {
      await axios.post(`${this.endpoint}/api/v0/pin/add?arg=${hash}`);
    } catch (error) {
      console.error('Failed to pin in IPFS:', error);
      throw error;
    }
  }
  
  async unpin(hash: string): Promise<void> {
    try {
      await axios.post(`${this.endpoint}/api/v0/pin/rm?arg=${hash}`);
    } catch (error) {
      console.error('Failed to unpin in IPFS:', error);
      throw error;
    }
  }
}