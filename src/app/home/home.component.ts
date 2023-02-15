import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { InstanceService } from '../services/instance.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  public pvmList: Array<Object> = [];
  public showLoading = true;
  
  constructor(private router: Router, public instanceService: InstanceService) { }

  ngOnInit() {
    this.showLoading = true;
    this.instanceService.getAllInstances().then(list => this.pvmList = list)
    this.showLoading = false;

  }

  pvmInstance(instanceId: string) {
    this.router.navigate(["/instance", instanceId]);
  }
}
