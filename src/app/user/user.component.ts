import { Component, OnInit } from '@angular/core';
import { FormBuilder } from "@angular/forms";
import { UserService } from '../services/user.service'

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.scss']
})
export class UserComponent implements OnInit {
  public showLoading = true;
  public userList: Array<Object> = [];
  public modelEdit = false;
  public modelDelete = false;
  public user: any = {};

  public userForm = this.fb.group({
    name: [{ disabled: false }],
    email: [{ disabled: false }]
  });

  constructor(public userService: UserService,  private fb: FormBuilder) { }

  ngOnInit(): void {
    this.userService.getAllUsers().then(users => this.userList = users)
    this.showLoading = false;
  }

  openModalEdit(user) {
    this.userForm.patchValue({
      name: user.name,
      email: user.email
    })
    this.user.id = user.id;
    this.user.role = user.role;
    this.modelEdit = true;
  }

  openModalDelete(user) {
    this.user = user;
    this.modelDelete = true;
  }

  closeModalDelete() {
    this.modelDelete = false;
  }

  closeModalEdit() {
    this.modelEdit = false;
  }

  updateUser(role) {
    this.closeModalEdit();
    let newUser = {
      name: this.userForm.value.name,
      email: this.userForm.value.email,
      role: role.value ? role.value : this.user.role
    }
    this.userService.updateUser(this.user.id, newUser)
    .then(data => {
      this.refreshData();
    }).catch(error => {
      this.closeModalDelete();
      console.log("error", error);
    })
    this.closeModalEdit();
  }

  deleteUser(userId) {
    console.log(userId);
    this.modelDelete = false;
  }

  refreshData() {
    location.reload();
  }
}
