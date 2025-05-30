export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  id?: string;
  conversationId?: number;
  timestamp?: Date;
};

export type StreamResponse = {
  conversation_id: number;
  text?: string;
  status: "streaming" | "complete" | "error";
  error?: string;
};

export type WebSocketState = "connecting" | "open" | "closed" | "error";

export class ChatWebSocket {
  private socket: WebSocket | null = null;
  private url: string;
  private messageQueue: string[] = [];
  private messageCallbacks: ((message: StreamResponse) => void)[] = [];
  private stateChangeCallbacks: ((state: WebSocketState) => void)[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private state: WebSocketState = "closed";

  constructor(url: string = "ws://localhost:8000/ws/chat") {
    this.url = url;
  }

  public connect(): void {
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    try {
      this.updateState("connecting");
      this.socket = new WebSocket(this.url);

      this.socket.onopen = () => {
        this.reconnectAttempts = 0;
        this.updateState("open");
        this.processQueuedMessages();
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as StreamResponse;

          // Ensure all required fields are present
          if (!data.conversation_id && data.conversation_id !== 0) {
            data.conversation_id = 0;
          }

          if (!data.status) {
            data.status = "error";
            data.error = "Invalid response format from server (missing status)";
          }

          // Text field might be missing for complete/error status
          if (data.status === "streaming" && !data.text && data.text !== "") {
            data.text = "";
          }

          this.notifyMessageCallbacks(data);
        } catch (error) {
          // Try to notify callbacks with an error message
          const errorResponse: StreamResponse = {
            status: "error",
            conversation_id: 0,
            error: `Error parsing WebSocket message: ${error}`,
          };

          this.notifyMessageCallbacks(errorResponse);
        }
      };

      this.socket.onclose = (event) => {
        this.updateState("closed");
        this.tryReconnect();
      };

      this.socket.onerror = (error) => {
        this.updateState("error");
        // Socket will close automatically after an error
      };
    } catch (error) {
      this.updateState("error");
      this.tryReconnect();
    }
  }

  public sendMessage(message: string, conversationId?: number | null): void {
    const payload = JSON.stringify({
      message,
      // Only include conversation_id if it's a valid number
      ...(conversationId !== null &&
        conversationId !== undefined && { conversation_id: conversationId }),
    });

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(payload);
    } else {
      this.messageQueue.push(payload);
      if (this.socket?.readyState !== WebSocket.CONNECTING) {
        this.connect();
      }
    }
  }

  public onMessage(callback: (message: StreamResponse) => void): () => void {
    this.messageCallbacks.push(callback);
    return () => {
      this.messageCallbacks = this.messageCallbacks.filter(
        (cb) => cb !== callback
      );
    };
  }

  public onStateChange(callback: (state: WebSocketState) => void): () => void {
    this.stateChangeCallbacks.push(callback);
    callback(this.state); // Immediately call with current state
    return () => {
      this.stateChangeCallbacks = this.stateChangeCallbacks.filter(
        (cb) => cb !== callback
      );
    };
  }

  public disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.updateState("closed");
  }

  private updateState(newState: WebSocketState): void {
    this.state = newState;
    this.notifyStateChangeCallbacks(newState);
  }

  private notifyMessageCallbacks(message: StreamResponse): void {
    this.messageCallbacks.forEach((callback) => callback(message));
  }

  private notifyStateChangeCallbacks(state: WebSocketState): void {
    this.stateChangeCallbacks.forEach((callback) => callback(state));
  }

  private processQueuedMessages(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        if (message) {
          this.socket.send(message);
        }
      }
    }
  }

  private tryReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }
}
