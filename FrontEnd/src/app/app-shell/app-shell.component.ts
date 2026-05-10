import { Component, inject } from "@angular/core";
import { RouterOutlet, RouterLinkWithHref, Router, RouterLinkActive } from "@angular/router";
import { TranslocoPipe } from "@jsverse/transloco";
import { Route } from "../app.routes";

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, TranslocoPipe, RouterLinkWithHref, RouterLinkActive],
  templateUrl: 'app-shell.component.html',
  styleUrl: 'app-shell.component.css'
})
export class AppShellComponent {
  public Route = Route;
  protected readonly router = inject(Router);
  public constructor() {
  }
}