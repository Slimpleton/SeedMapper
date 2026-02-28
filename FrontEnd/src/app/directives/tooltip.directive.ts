import {
  Directive,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  ComponentRef,
  EnvironmentInjector,
  Injector,
  createComponent,
  ApplicationRef
} from '@angular/core';
import { Subject, timer, merge } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { TOOLTIP_DATA, TooltipComponent, TooltipData } from '../tooltip/tooltip.component';

export interface TooltipOptions {
  delay?: number;
  showOnHover?: boolean;
  showOnLongPress?: boolean;
  pressDuration?: number;
  mobileDisplayDuration?: number;
}

@Directive({
  selector: '[tooltip]',
  standalone: true
})
export class TooltipDirective implements OnInit, OnDestroy {
  private readonly _destroy$ = new Subject<void>();
  private readonly _mouseEnter$ = new Subject<void>();
  private readonly _mouseLeave$ = new Subject<void>();
  private readonly _touchStart$ = new Subject<void>();
  private readonly _touchEnd$ = new Subject<void>();
  private readonly _touchMove$ = new Subject<void>();

  private _tooltipComponent: ComponentRef<TooltipComponent> | null = null;
  private _isTooltipVisible: boolean = false;
  private _eventCleanupFunctions: Array<() => void> = [];

  // Configuration options
  private _pressDuration: number = 1_000;
  private _mobileDisplayDuration: number = 2_500;
  private _showOnHover: boolean = true;
  private _showOnLongPress: boolean = true;

  @Input() public tooltip: string = '';
  @Input() public tooltipDelay: number = 0;

  @Input()
  public set tooltipOptions(options: TooltipOptions) {
    if (options.delay !== undefined) {
      this.tooltipDelay = options.delay;
    }
    if (options.showOnHover !== undefined) {
      this._showOnHover = options.showOnHover;
    }
    if (options.showOnLongPress !== undefined) {
      this._showOnLongPress = options.showOnLongPress;
    }
    if (options.pressDuration !== undefined) {
      this._pressDuration = options.pressDuration;
    }
    if (options.mobileDisplayDuration !== undefined) {
      this._mobileDisplayDuration = options.mobileDisplayDuration;
    }
  }

  constructor(
    private readonly _el: ElementRef,
    private readonly _appRef: ApplicationRef,
    private readonly _injector: EnvironmentInjector
  ) { }

  public ngOnInit(): void {
    this._setupEventListeners();
    this._setupHoverTooltip();
    this._setupLongPressTooltip();
  }

  private _setupEventListeners(): void {
    const element = this._el.nativeElement;

    if (this._showOnHover) {
      // Mouse events
      const mouseEnterCleanup = this._addEventListener(element, 'mouseenter', () => {
        this._mouseEnter$.next();
      });

      const mouseLeaveCleanup = this._addEventListener(element, 'mouseleave', () => {
        this._mouseLeave$.next();
      });

      this._eventCleanupFunctions.push(mouseEnterCleanup, mouseLeaveCleanup);
    }

    if (this._showOnLongPress) {
      // Touch events
      const touchStartCleanup = this._addEventListener(element, 'touchstart', () => {
        this._touchStart$.next();
      }, { passive: true });

      const touchEndCleanup = this._addEventListener(element, 'touchend', () => {
        this._touchEnd$.next();
      }, { passive: true });

      const touchCancelCleanup = this._addEventListener(element, 'touchcancel', () => {
        this._touchEnd$.next();
      }, { passive: true });

      const touchMoveCleanup = this._addEventListener(element, 'touchmove', () => {
        this._touchMove$.next();
      }, { passive: true });

      this._eventCleanupFunctions.push(
        touchStartCleanup,
        touchEndCleanup,
        touchCancelCleanup,
        touchMoveCleanup
      );
    }
  }

  private _addEventListener(
    element: HTMLElement,
    eventName: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ): () => void {
    element.addEventListener(eventName, handler, options);
    return () => element.removeEventListener(eventName, handler, options);
  }

  private _setupHoverTooltip(): void {
    if (!this._showOnHover) {
      return;
    }

    this._mouseEnter$
      .pipe(
        switchMap(() => timer(this.tooltipDelay).pipe(takeUntil(this._mouseLeave$))),
        takeUntil(this._destroy$)
      )
      .subscribe(() => this._showTooltip());

    this._mouseLeave$
      .pipe(takeUntil(this._destroy$))
      .subscribe(() => this._hideTooltip());
  }

  private _setupLongPressTooltip(): void {
    if (!this._showOnLongPress) {
      return;
    }

    const cancelTouch$ = merge(this._touchEnd$, this._touchMove$);

    this._touchStart$
      .pipe(
        switchMap(() => timer(this._pressDuration).pipe(
          takeUntil(cancelTouch$)
        )),
        switchMap(() => {
          this._showTooltip();
          return timer(this._mobileDisplayDuration);
        }),
        takeUntil(this._destroy$)
      )
      .subscribe(() => this._hideTooltip());
  }

  private _showTooltip(): void {
    if (this._isTooltipVisible || !this.tooltip) {
      return;
    }

    this._isTooltipVisible = true;

    const tooltipData: TooltipData = {
      tooltip: this.tooltip,
    };

    const injector = Injector.create({
      providers: [
        { provide: TOOLTIP_DATA, useValue: tooltipData }
      ],
      parent: this._injector
    });

    // Create component and attach to document.body instead of ViewContainerRef
    this._tooltipComponent = createComponent(TooltipComponent, {
      environmentInjector: this._injector,
      elementInjector: injector
    });

    // Attach to application to enable change detection
    this._appRef.attachView(this._tooltipComponent.hostView);

    // Append to document.body (NOT inside the SVG!)
    const tooltipElement = this._tooltipComponent.location.nativeElement;
    document.body.appendChild(tooltipElement);

    // Use requestAnimationFrame for proper layout timing
    requestAnimationFrame(() => {
      if (this._tooltipComponent) {
        this._positionTooltip(tooltipElement);
        tooltipElement.style.visibility = 'visible'; // Show after positioning
      }
    });
  }

  private _hideTooltip(): void {
    if (!this._isTooltipVisible) {
      return;
    }

    this._isTooltipVisible = false;

    if (this._tooltipComponent) {
      // Detach from application
      this._appRef.detachView(this._tooltipComponent.hostView);

      // Remove from DOM
      const tooltipElement = this._tooltipComponent.location.nativeElement;
      if (tooltipElement.parentNode) {
        tooltipElement.parentNode.removeChild(tooltipElement);
      }

      // Destroy component
      this._tooltipComponent.destroy();
      this._tooltipComponent = null;
    }
  }

  private _positionTooltip(tooltipElement: HTMLElement): void {
    const hostRect = this._el.nativeElement.getBoundingClientRect();
    const tooltipRect = tooltipElement.getBoundingClientRect();
    const spacing = 8;

    let top = hostRect.top - tooltipRect.height - spacing;
    let left = hostRect.left + (hostRect.width - tooltipRect.width) / 2;

    // Keep tooltip within viewport bounds
    const padding = 10;
    const maxLeft = window.innerWidth - tooltipRect.width - padding;
    const maxTop = window.innerHeight - tooltipRect.height - padding;

    left = Math.max(padding, Math.min(left, maxLeft));
    top = Math.max(padding, Math.min(top, maxTop));

    // Use fixed positioning so it stays relative to viewport, not scroll position
    tooltipElement.style.position = 'fixed';
    tooltipElement.style.top = `${top}px`;
    tooltipElement.style.left = `${left}px`;
    tooltipElement.style.zIndex = '10000';
  }

  public ngOnDestroy(): void {
    // Clean up all event listeners
    this._eventCleanupFunctions.forEach(cleanup => cleanup());
    this._eventCleanupFunctions = [];

    this._destroy$.next();
    this._destroy$.complete();
    this._hideTooltip();
  }
}