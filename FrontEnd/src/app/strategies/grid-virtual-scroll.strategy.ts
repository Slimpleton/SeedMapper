import { CdkVirtualScrollViewport, VirtualScrollStrategy } from '@angular/cdk/scrolling';
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

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

    public configure(rowHeight: number, columns: number, buffer = 3) {
        // Capture the first visible item index before changing any parameters so
        // we can restore the scroll position after the grid layout changes.
        const firstVisibleIndex = this._getFirstVisibleIndex();

        this._rowHeight = rowHeight;
        this._columns = columns;
        this._buffer = buffer;

        this._updateTotalSize();
        this._updateRenderedRange();

        // Scroll back to the same item so the viewport doesn't jump when the
        // column count (or row height) changes.
        if (firstVisibleIndex > 0) {
            this.scrollToIndex(firstVisibleIndex, 'instant');
        }
    }

    public attach(viewport: CdkVirtualScrollViewport) {
        this._viewport = viewport;
        this._dataLength = viewport.getDataLength();
        this._updateTotalSize();
        this._updateRenderedRange();
    }

    public detach() {
        this._scrolledIndexChange$.complete();
        this._viewport = null;
    }

    public onContentScrolled() { this._updateRenderedRange(); }

    public onDataLengthChanged() {
        this._dataLength = this._viewport?.getDataLength() ?? 0;
        this._updateTotalSize();
        this._updateRenderedRange();
    }

    public onContentRendered() { }
    public onRenderedOffsetChanged() { }

    public scrollToIndex(index: number, behavior: ScrollBehavior) {
        const row = Math.floor(index / this._columns);
        this._viewport?.scrollToOffset(row * this._rowHeight, behavior);
    }

    private _getFirstVisibleIndex(): number {
        if (!this._viewport) return 0;
        const scrollOffset = this._viewport.measureScrollOffset();
        // Use ceil so we get the first *fully* visible row rather than the row
        // that is partially scrolled off the top.
        const firstFullyVisibleRow = Math.ceil(scrollOffset / this._rowHeight);
        return firstFullyVisibleRow * this._columns;
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