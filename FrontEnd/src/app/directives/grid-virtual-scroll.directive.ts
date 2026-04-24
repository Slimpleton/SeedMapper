// grid-virtual-scroll.directive.ts
import {
    AfterViewInit,
    Directive, Input, OnChanges, OnDestroy,
} from '@angular/core';
import { CdkVirtualScrollViewport, VIRTUAL_SCROLL_STRATEGY } from '@angular/cdk/scrolling';
import { GridVirtualScrollStrategy } from '../strategies/grid-virtual-scroll.strategy';

@Directive({
    selector: 'cdk-virtual-scroll-viewport[gridScroll]',
    standalone: true,
    exportAs: 'gridScroll',
    providers: [
        GridVirtualScrollStrategy,
        { provide: VIRTUAL_SCROLL_STRATEGY, useExisting: GridVirtualScrollStrategy }
    ]
})
export class GridVirtualScrollDirective implements OnChanges, OnDestroy, AfterViewInit {
    @Input() rowHeight = 360;
    @Input() columns = 1;
    @Input() buffer = 3;
    @Input() gutterSize = 0;

    constructor(private readonly _strategy: GridVirtualScrollStrategy,
        private readonly _viewport: CdkVirtualScrollViewport  // inject the host viewport
    ) { }
    ngAfterViewInit(): void {
        this._strategy.configure(this.rowHeight, this.columns, this.buffer);
    }

    ngOnChanges() {
        this._strategy.configure(this.rowHeight, this.columns, this.buffer);
    }

    ngOnDestroy() {
        this._strategy.detach();
    }

    get gridStyles(): Record<string, string> {
        return {
            'grid-template-columns': `repeat(${this.columns}, 1fr)`,
            'gap': `${this.gutterSize}px`
        };
    }
}