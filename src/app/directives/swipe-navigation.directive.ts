import {
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { Gesture, GestureController } from '@ionic/angular';

@Directive({
  selector: '[appSwipeNavigation]',
  standalone: true,
})
export class SwipeNavigationDirective implements OnInit, OnDestroy {
  @Input() swipeDisabled = false;
  @Input() swipeThreshold = 40;
  @Input() velocityThreshold = 0.25;

  @Output() swipeLeft = new EventEmitter<void>();
  @Output() swipeRight = new EventEmitter<void>();

  private gesture?: Gesture;
  private isSwiping = false;

  constructor(
    private el: ElementRef<HTMLElement>,
    private gestureCtrl: GestureController
  ) {}

  ngOnInit(): void {
    this.gesture = this.gestureCtrl.create({
      el: this.el.nativeElement,
      gestureName: 'swipe-navigation',
      direction: 'x',
      threshold: 15,
      canStart: () => !this.swipeDisabled,
      onStart: () => {
        this.isSwiping = true;
      },
      onEnd: (ev) => {
        if (this.swipeDisabled) {
          this.isSwiping = false;
          return;
        }

        const isLeft =
          ev.deltaX < -this.swipeThreshold ||
          (ev.deltaX < -15 && ev.velocityX < -this.velocityThreshold);
        const isRight =
          ev.deltaX > this.swipeThreshold ||
          (ev.deltaX > 15 && ev.velocityX > this.velocityThreshold);

        if (isLeft) {
          this.triggerHaptic();
          this.swipeLeft.emit();
        } else if (isRight) {
          this.triggerHaptic();
          this.swipeRight.emit();
        }

        setTimeout(() => {
          this.isSwiping = false;
        }, 150);
      },
    });

    this.gesture.enable(true);
  }

  ngOnDestroy(): void {
    this.gesture?.destroy();
  }

  @HostListener('click', ['$event'])
  onClickCapture(event: MouseEvent): void {
    if (this.isSwiping) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  private triggerHaptic(): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(25);
      } catch (_) {}
    }
  }
}

