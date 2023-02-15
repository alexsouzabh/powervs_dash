import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './login/login.component';
import { HeaderComponent } from './header/header.component';
import { HomeComponent } from './home/home.component';
import { InstanceComponent } from './instance/instance.component';
import { UserComponent } from './user/user.component';

import { 
  GridModule, 
  LoadingModule, 
  UIShellModule,
  TilesModule,
  TableModule,
  ButtonModule,
  TabsModule,
  LinkModule,
  AccordionModule,
  ModalModule,
  InputModule,
  SelectModule
} from 'carbon-components-angular';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    HeaderComponent,
    HomeComponent,
    InstanceComponent,
    UserComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    GridModule,
    LoadingModule,
    UIShellModule,
    TilesModule,
    TableModule,
    ButtonModule,
    TabsModule,
    LinkModule,
    AccordionModule,
    ModalModule,
    InputModule,
    SelectModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
