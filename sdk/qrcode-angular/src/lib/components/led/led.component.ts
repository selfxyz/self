// led.component.ts
import { ChangeDetectionStrategy, Component, HostBinding, Input } from '@angular/core';
import { QRcodeSteps } from '../../utils/utils';

@Component({
  selector: 'lib-led',
  standalone: true,
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LedComponent {
  private readonly green = '#31F040';
  private readonly blue = '#424AD8';
  private readonly gray = '#95a5a6';

  @Input() size = 8;
  @Input() connectionStatus: number = QRcodeSteps.WAITING_FOR_MOBILE;

  private get color(): string {
    if (this.connectionStatus >= QRcodeSteps.MOBILE_CONNECTED) {
      return this.green;
    } else if (this.connectionStatus >= QRcodeSteps.WAITING_FOR_MOBILE) {
      return this.blue;
    }
    return this.gray;
  }

  // Host bindings to style the component’s root element like the React <div />
  @HostBinding('style.display') display = 'block';
  @HostBinding('style.width.px') get w() {
    return this.size;
  }
  @HostBinding('style.height.px') get h() {
    return this.size;
  }
  @HostBinding('style.borderRadius') br = '50%';
  @HostBinding('style.background') get bg() {
    return this.color;
  }
  @HostBinding('style.boxShadow') get shadow() {
    return `0 0 ${this.size * 1.5}px ${this.color}`;
  }
  @HostBinding('style.transition') transition = 'all 0.3s ease';
  @HostBinding('style.marginBottom.px') mb = 8;
  @HostBinding('attr.role') role = 'img';
  @HostBinding('attr.aria-label') get ariaLabel() {
    return `Connection status LED: ${this.connectionStatus}`;
  }
}
