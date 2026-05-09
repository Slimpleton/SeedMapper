import { Component, Input } from '@angular/core';

export type IconName = 'cloud' | 'partly-cloudy' | 'image' | 'help' | 'search' | 'sort-alpha' | 'sunny' | 'location_marker' | 'undo' | 'arrow';

@Component({
  selector: 'app-icon',
  imports: [],
  template: `
  <svg [attr.width]="size" [attr.height]="size" [attr.fill]="color" aria-hidden="true" [attr.stroke]="stroke">
    <use [attr.href]="'/assets/icons.svg#' + name"></use>
  </svg>
  `,
  styleUrl: './icon.component.css',
})
export class IconComponent {
  private static readonly _defaultColors: Record<IconName, string> = {
    'cloud': 'rgb(68, 51, 29)',
    'partly-cloudy': 'rgb(68, 51, 29)',
    'image': 'rgb(68, 51, 29)',
    'help': 'rgb(68, 51, 29)',
    'search': 'red',
    'sort-alpha': 'rgb(68, 51, 29)',
    'sunny': 'rgb(68, 51, 29)',
    'location_marker': 'rgb(68, 51, 29)',
    'undo': 'rgb(68, 51, 29)',
    'arrow':'rgb(68, 51, 29)'
  };

  @Input({required: true}) name!: IconName;
  @Input() size: number = 24;
  private _color?: string;
  private _stroke?: string;

  @Input() set stroke(value: string) {
    this._stroke = value;
  }

  get stroke(): string{
    if(this._stroke) return this._stroke;
    return IconComponent._defaultColors[this.name];
  }

  @Input()
  set color(value: string | undefined) {
    this._color = value;
  }

  get color(): string {
    if (this._color) return this._color;
    return IconComponent._defaultColors[this.name];
  }
}
