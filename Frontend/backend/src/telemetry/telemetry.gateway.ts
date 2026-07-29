import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: process.env.CORS_ORIGIN || 'http://localhost:3000', credentials: true },
  namespace: '/telemetry',
})
export class TelemetryGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('TelemetryGateway');
  private connectedClients = new Map<string, { userId?: string; joinedAt: Date }>();

  handleConnection(client: Socket) {
    this.connectedClients.set(client.id, { joinedAt: new Date() });
    this.logger.log(`Client connected: ${client.id} (Total: ${this.connectedClients.size})`);
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id} (Total: ${this.connectedClients.size})`);
  }

  @SubscribeMessage('subscribe:telemetry')
  handleSubscribeTelemetry(@ConnectedSocket() client: Socket, @MessageBody() data: { deviceId: string }) {
    client.join(`telemetry:${data.deviceId}`);
    this.logger.debug(`Client ${client.id} subscribed to telemetry:${data.deviceId}`);
    return { event: 'subscribed', data: { channel: `telemetry:${data.deviceId}` } };
  }

  @SubscribeMessage('subscribe:alerts')
  handleSubscribeAlerts(@ConnectedSocket() client: Socket, @MessageBody() data: { siteId: string }) {
    client.join(`alerts:${data.siteId}`);
    return { event: 'subscribed', data: { channel: `alerts:${data.siteId}` } };
  }

  @SubscribeMessage('gimbal:command')
  handleGimbalCommand(@ConnectedSocket() client: Socket, @MessageBody() data: { deviceId: string; command: string; value?: any }) {
    // Broadcast gimbal command to device subscribers
    this.server.to(`telemetry:${data.deviceId}`).emit('gimbal:state', {
      command: data.command,
      value: data.value,
      timestamp: new Date().toISOString(),
    });
    return { event: 'command:ack', data: { command: data.command } };
  }

  // Methods for server-side emission
  broadcastTelemetry(deviceId: string, telemetryData: any) {
    this.server.to(`telemetry:${deviceId}`).emit('telemetry:update', telemetryData);
  }

  broadcastAlert(siteId: string, alert: any) {
    this.server.to(`alerts:${siteId}`).emit('alert:new', alert);
  }

  broadcastToAll(event: string, data: any) {
    this.server.emit(event, data);
  }

  getConnectedClientsCount() {
    return this.connectedClients.size;
  }
}
