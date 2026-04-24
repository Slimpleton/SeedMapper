import { CdkVirtualScrollViewport, VirtualScrollStrategy } from '@angular/cdk/scrolling';
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

// TODO fix bug that occurs with index position when column count changes
@Injectable()
export class GridVirtualScrollStrategy implements VirtualScrollStrategy {
    private _viewport: CdkVirtualScrollViewport | null = null;
    private _columns = 1;
    private _rowHeight = 360;
    private _buffer = 3;
    private _dataLength = 0;

    readonly scrolledIndexChange: Observable<number>;
    private _scrolledIndexChange$ = new Subject<number>();

    constructor() {
        this.scrolledIndexChange = this._scrolledIndexChange$.pipe(distinctUntilChanged());
    }

    configure(rowHeight: number, columns: number, buffer = 3) {
        this._rowHeight = rowHeight;
        this._columns = columns;
        this._buffer = buffer;
        this._updateTotalSize();
        this._updateRenderedRange();
    }

    attach(viewport: CdkVirtualScrollViewport) {
        this._viewport = viewport;
        this._dataLength = viewport.getDataLength();

        this._updateTotalSize();
        this._updateRenderedRange();
    }

    detach() {
        this._scrolledIndexChange$.complete();
        this._viewport = null;
    }

    onContentScrolled() { this._updateRenderedRange(); }
    onDataLengthChanged() {
        this._dataLength = this._viewport?.getDataLength() ?? 0;
        this._updateTotalSize();
        this._updateRenderedRange();
    }
    onContentRendered() { }
    onRenderedOffsetChanged() { }

    scrollToIndex(index: number, behavior: ScrollBehavior) {
        const row = Math.floor(index / this._columns);
        this._viewport?.scrollToOffset(row * this._rowHeight, behavior);
    }

    private _updateTotalSize() {
        if (!this._viewport) return;
        const totalRows = Math.ceil(this._dataLength / this._columns);
        this._viewport.setTotalContentSize(totalRows * this._rowHeight);
    }

    private _updateRenderedRange() {
        if (!this._viewport) return;
        const scrollOffset = this._viewport.measureScrollOffset();
        const viewportSize = this._viewport.getViewportSize();
        const firstVisibleRow = Math.floor(scrollOffset / this._rowHeight);
        const visibleRows = Math.ceil(viewportSize / this._rowHeight);
        const startRow = Math.max(0, firstVisibleRow - this._buffer);
        const endRow = firstVisibleRow + visibleRows + this._buffer;
        const start = startRow * this._columns;
        const end = Math.min(this._dataLength, endRow * this._columns);
        this._viewport.setRenderedRange({ start, end });
        this._viewport.setRenderedContentOffset(startRow * this._rowHeight);
        this._scrolledIndexChange$.next(start);
    }
}