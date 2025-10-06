import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { v4 as uuidv4 } from 'uuid';

import type { SelfApp } from '../../common';
import { getUniversalLink, REDIRECT_URL, WS_DB_RELAYER } from '../../common';
import { QRcodeSteps } from '../../utils/utils';
import { WebSocketService } from '../../services/websocket.service';
import { LedComponent } from '../led/led.component';
import { AnimationOptions, LottieComponent, provideLottieOptions } from 'ngx-lottie';

import { QRCodeComponent } from 'angularx-qrcode';
import CHECK_ANIMATION from '../animations/check_animation.json';
import X_ANIMATION from '../animations/x_animation.json';

export interface SelfQRcodeProps {
  selfApp: SelfApp;
  onSuccess: () => void;
  onError: (data: { error_code?: string; reason?: string }) => void;
  type?: 'websocket' | 'deeplink';
  websocketUrl?: string;
  size?: number;
  darkMode?: boolean;
}

@Component({
  selector: 'lib-self-qrcode',
  standalone: true,
  imports: [CommonModule, LedComponent, QRCodeComponent, LottieComponent],
  providers: [provideLottieOptions({ player: () => import('lottie-web') })],
  templateUrl: './self-qrcode.component.html',
  styleUrls: ['./self-qrcode.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelfQRcodeComponent implements OnInit, OnDestroy {
  @Input() selfApp!: SelfApp;
  @Input() successFn!: () => void;
  @Input() errorFn!: (data: { error_code?: string; reason?: string }) => void;
  @Input() type: 'websocket' | 'deeplink' = 'websocket';
  @Input() websocketUrl: string = WS_DB_RELAYER;
  @Input() size: number = 300;
  @Input() darkMode: boolean = false;

  // Signals for reactive state management
  proofStep = signal<number>(QRcodeSteps.WAITING_FOR_MOBILE);
  sessionId = signal<string>('');
  qrCodeValue = signal<string>('');

  // Expose QRcodeSteps for template access
  QRcodeSteps = QRcodeSteps;

  // Lottie animation instances
  successOptions: AnimationOptions = {
    animationData: CHECK_ANIMATION,
    loop: false,
    autoplay: true,
  };

  errorOptions: AnimationOptions = {
    animationData: X_ANIMATION,
    loop: false,
    autoplay: true,
  };

  constructor(private webSocketService: WebSocketService) {}

  ngOnInit(): void {
    // Generate session ID
    const newSessionId = uuidv4();
    this.sessionId.set(newSessionId);
    console.log('[SelfQRcode] sessionId', newSessionId);

    // Initialize WebSocket connection
    this.initializeWebSocket();

    // Set up QR code value
    this.updateQRCodeValue();
  }

  ngOnDestroy(): void {
    // Cleanup is handled by the WebSocketService
    this.webSocketService.cleanup();
  }

  private initializeWebSocket(): void {
    const sessionId = this.sessionId();
    console.log('[SelfQRcode] sessionId', sessionId);
    if (!sessionId) return;

    // Create selfApp with session ID
    const selfAppWithSession = {
      ...this.selfApp,
      sessionId: sessionId,
    };

    // Initialize WebSocket connection
    this.webSocketService.initializeConnection(
      this.websocketUrl,
      selfAppWithSession,
      this.type,
      this.successFn,
      this.errorFn
    );

    // Subscribe to proof step updates
    this.webSocketService.proofStep$.subscribe((step: number) => {
      this.proofStep.set(step);
    });
  }

  private updateQRCodeValue(): void {
    const sessionId = this.sessionId();
    if (!sessionId) return;

    let qrValue: string;

    if (this.type === 'websocket') {
      qrValue = `${REDIRECT_URL}?sessionId=${sessionId}`;
    } else {
      qrValue = getUniversalLink({
        ...this.selfApp,
        sessionId: sessionId,
      });
    }

    this.qrCodeValue.set(qrValue);
  }

  resetToWaiting(): void {
    this.webSocketService.resetStep();
  }
}
