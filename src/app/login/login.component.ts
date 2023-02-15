import { Component, OnInit } from '@angular/core';
// import { UserService } from '../services/user.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  public showLoading = true;

  constructor() { }

  ngOnInit(): void {
    this.showLoading = false;
  }

  // async isLogged(apikey) {
  //   await this.usersService.isLogged(apikey)
  // }
}
