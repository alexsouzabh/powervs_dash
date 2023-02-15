import { Component, OnInit, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TableModel, TableItem, TableRow, TableHeaderItem } from "carbon-components-angular";
import { InstanceService } from '../services/instance.service'; 

@Component({
  selector: 'app-instance',
  templateUrl: './instance.component.html',
  styleUrls: ['./instance.component.scss']
})
export class InstanceComponent implements OnInit {
  public showLoading = true;

  public instance: any = {};

  constructor(public instanceService: InstanceService, private route: ActivatedRoute) { }

  ngOnInit(): void {
    this.showLoading = true;

    let instanceId = this.route.snapshot.paramMap.get('instanceId');
    this.instanceService.getInstance(instanceId).then(instance => {
      this.instance = instance;
      this.createModels(instance);
      this.createModelConsolidated(instance);
    })
   
    this.showLoading = false;
  }

  createModels(instance: any) {
    let newPvms = []
    instance.pvm_instances.map(pvm => {
      let model = new TableModel();

      model.header = [new TableHeaderItem({data: ""}), new TableHeaderItem({data: "AIX License"}), new TableHeaderItem({data: "Processador" }), new TableHeaderItem({data: "RAM" }), new TableHeaderItem({data: "High Use RAM" }), new TableHeaderItem({data: "SSD" }), new TableHeaderItem({data: "NVMe Disks" }), new TableHeaderItem({data: "Total" })]

      let row1 = new TableRow(new TableItem({data: "Quantidade"}), new TableItem({data: pvm.sys_type === "s922" ? "AIX Scale Out License" : "AIX Enterprise License"}), new TableItem({data: pvm.processors}), new TableItem({data: pvm.memory}), new TableItem({data: pvm.high_ram}), new TableItem({data: pvm.volume_size.tier1.total}), new TableItem({data: pvm.volume_size.tier3.total}), new TableItem({data: "-"}));

      let row2 = new TableRow(new TableItem({data: "Valor"}), new TableItem({data: pvm.sys_type === "s922" ? `US$ ${pvm.billing.sos}` : `US$ ${pvm.billing.ess}`}), new TableItem({data: pvm.sys_type === "s922" ? `US$ ${pvm.billing.aix_sol}` : `US$ ${pvm.billing.aix_el}`}), new TableItem({data: `US$ ${pvm.billing.ram}`}), new TableItem({data: `US$ ${pvm.billing.high_ram}`}), new TableItem({data: `US$ ${pvm.billing.ssd}` }), new TableItem({data:  `US$ ${pvm.billing.hdd}`}), new TableItem({data: `US$ ${pvm.billing.total}`}));

      model.data = [row1, row2];

      pvm.model = model
      newPvms.push(pvm)
    })

    this.instance.pvm_instances = newPvms
    console.log(this.instance.pvm_instances)
  }

  createModelConsolidated(instance: any) {
    let modelConsolidated = new TableModel();
    modelConsolidated.header = [new TableHeaderItem({data: "Item"}), new TableHeaderItem({data: "Nome" }), new TableHeaderItem({data: "Custo" })];

    let rows = []

    instance.pvm_instances.map(pvm => {
      rows.push(new TableRow(new TableItem({data: "LPAR"}), new TableItem({data: `${pvm.server_name}`}), new TableItem({data: `US$ ${pvm.billing.total}`})));
    })

    instance.images.map(image => {
      rows.push(new TableRow(new TableItem({data: "Imagem"}), new TableItem({data: `${image.name}`}), new TableItem({data: `US$ ${image.billing}`})));
    })

    rows.push(new TableRow(new TableItem({data: "Valor"}), new TableItem({data: "Total identificado"}), new TableItem({data: `US$ ${instance.billing.total}`})));
    rows.push(new TableRow(new TableItem({data: "Valor"}), new TableItem({data: "Total não identificado"}), new TableItem({data: `US$ ${instance.billing.n_a}`})));
    rows.push(new TableRow(new TableItem({data: "Valor"}), new TableItem({data: "Total instância"}), new TableItem({data: `US$ ${instance.billing.total_cost}`})));
    
    modelConsolidated.data = rows
    this.instance.model = modelConsolidated
  }
}
