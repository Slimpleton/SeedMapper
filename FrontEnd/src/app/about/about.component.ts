import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-about',
  imports: [TranslocoPipe],
  templateUrl: './about.component.html',
  styleUrl: './about.component.css',
})
export class AboutComponent {
  constructor(private readonly _title: Title){
    this._title.setTitle('About | What Grows Native Here');
  }
}
