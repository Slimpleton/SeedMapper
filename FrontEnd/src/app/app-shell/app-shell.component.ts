import { Component, inject, viewChild } from "@angular/core";
import { RouterOutlet, RouterLinkWithHref, Router, RouterLinkActive } from "@angular/router";
import { AvailableLangs, LangDefinition, TranslocoPipe, TranslocoService } from "@jsverse/transloco";
import { Route } from "../app.routes";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@angular/aria/menu";
import { Observable } from "rxjs";
import { CdkConnectedOverlay } from "@angular/cdk/overlay";
import { UpperCasePipe } from "@angular/common";

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, TranslocoPipe, RouterLinkWithHref, RouterLinkActive,
    Menu,
    MenuContent,
    MenuItem,
    MenuTrigger, 
    CdkConnectedOverlay, 
    UpperCasePipe],
  templateUrl: 'app-shell.component.html',
  styleUrl: 'app-shell.component.css'
})
export class AppShellComponent {
  public Route = Route;
  protected readonly router = inject(Router);
  protected readonly languageMenu = viewChild<Menu<string>>('languageMenu');
  protected readonly translate = inject(TranslocoService);
  protected readonly availableLangs : AvailableLangs = this.translate.getAvailableLangs();

  public constructor() {
  }

  public swapLanguage(lang: string): void{
    console.log(lang);
    this.translate.setActiveLang(lang);
  }
}