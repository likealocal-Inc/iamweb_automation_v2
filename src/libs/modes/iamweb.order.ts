import { AutomationConfig } from '../../config/iamweb.automation/automation.config';
export class IamwebProductModel {
  code;
  order_no;
  status;
  claim_status;
  claim_type;
  pay_time = -1;
  delivery_time = -1;
  complete_time = -1;
  parcel_code;
  invoice_no;
  items = {
    no: '',
    prod_no: '',
    prod_name: '',
    prod_custom_code: '',
    prod_sku_no: '',
    payment: {
      count: '',
      price: '',
      price_tax_free: '',
      deliv_price_tax_free: '',
      deliv_price: '',
      island_price: '',
      price_sale: '',
      point: '',
      coupon: '',
      membership_discount: '',
      period_discount: '',
    },
    delivery: {
      deliv_code: '',
      deliv_price_mix: '',
      deliv_group_code: '',
      deliv_type: '',
      deliv_pay_type: '',
      deliv_price_type: '',
    },
    startLocation: '',
    startAddress: '',
    endLocation: '',
    endAddress: '',
    startAirport: '',
    endAirport: '',
  };

  constructor(data: any) {
    this.code = data.code;
    this.order_no = data.order_no;
    this.status = data.status;
    this.claim_status = data.claim_status;
    this.claim_type = data.claim_type;
    this.pay_time = data.pay_time;
    this.delivery_time = data.delivery_time;
    this.complete_time = data.complete_time;
    this.parcel_code = data.parcel_code;
    this.invoice_no = data.invoice_no;

    const items = data.items[0];
    this.items.no = items.no;
    this.items.prod_no = items.prod_no;
    this.items.prod_name = items.prod_name;
    this.items.prod_custom_code = items.prod_custom_code;
    this.items.prod_sku_no = items.prod_sku_no;

    this.items.payment.count = items.payment.count;
    this.items.payment.price = items.payment.price;
    this.items.payment.price_tax_free = items.payment.price_tax_free;
    this.items.payment.deliv_price_tax_free =
      items.payment.deliv_price_tax_free;
    this.items.payment.deliv_price = items.payment.deliv_price;
    this.items.payment.island_price = items.payment.island_price;
    this.items.payment.price_sale = items.payment.price_sale;
    this.items.payment.point = items.payment.point;
    this.items.payment.coupon = items.payment.coupon;
    this.items.payment.membership_discount = items.payment.membership_discount;
    this.items.payment.period_discount = items.payment.period_discount;

    this.items.delivery.deliv_code = items.delivery.deliv_code;
    this.items.delivery.deliv_price_mix = items.delivery.deliv_price_mix;
    this.items.delivery.deliv_group_code = items.delivery.deliv_group_code;
    this.items.delivery.deliv_type = items.delivery.deliv_type;
    this.items.delivery.deliv_pay_type = items.delivery.deliv_pay_type;
    this.items.delivery.deliv_price_type = items.delivery.deliv_price_type;

    if (items.options !== undefined) {
      const options = items.options[0][0].value_name_list;

      const productType = AutomationConfig.iamwebProductID;

      // 서울 -> 공항
      if (this.items.prod_no.toString() === productType.tSanding.toString()) {
        this.items.startAddress = options[0];
        this.items.startLocation = options[2];
        this.items.endLocation = options[1];
        this.items.endAddress = '';
        this.items.startAirport = options[1];
      }
      // 공항 -> 서울
      else if (
        this.items.prod_no.toString() === productType.tPickup.toString()
      ) {
        this.items.startAddress = '';
        this.items.startLocation = options[1];
        this.items.endLocation = options[0];
        this.items.endAddress = options[2];
        this.items.endAirport = options[1];
      } else if (
        this.items.prod_no.toString() === productType.tPrivateTaxi.toString()
      ) {
        this.items.startLocation = options[0];
        this.items.startAddress = options[1];
        this.items.endLocation = options[2];
        this.items.endAddress = options[3];
      }
    } else {
      this.items.startLocation = '';
      this.items.endLocation = '';
    }
  }
}

export class IamwebOrderGoogleModel {
  order_no;
  order_type;
  device = {
    type: '',
  };
  order_time = -1;
  complete_time = -1;
  orderer = {
    member_code: '',
    name: '',
    email: '',
    call: '',
    call2: '',
  };
  delivery = {
    country: '',
    country_text: '',
    address: {
      name: '',
      phone: '',
      phone2: '',
      postcode: '',
      address: '',
      address_detail: '',
      address_street: '',
      address_building: '',
      address_city: '',
      address_state: '',
      logistics_type: '',
    },
    memo: '',
  };
  payment = {
    pay_type: '',
    pg_type: '',
    deliv_type: '',
    deliv_pay_type: '',
    price_currency: '',
    total_price: '',
    deliv_price: '',
  };
  form = new Array<IamwebOrderFormModel>();

  product_item: IamwebProductModel;

  constructor(data: any) {
    this.order_no = data.order_no;
    this.order_type = data.order_type;

    this.device.type = data.device.type;
    this.order_time = data.order_time;
    this.complete_time = data.complete_time;

    this.orderer.member_code = data.orderer.member_code;
    this.orderer.name = data.orderer.name;
    this.orderer.email = data.orderer.email;
    this.orderer.call = data.orderer.call;
    this.orderer.call2 = data.orderer.call2;

    this.delivery.country = data.delivery.country;
    this.delivery.country_text = data.delivery.country_text;

    this.delivery.address.name = data.delivery.address.name;
    this.delivery.address.phone = data.delivery.address.phone;
    this.delivery.address.phone2 = data.delivery.address.phone2;
    this.delivery.address.postcode = data.delivery.address.postcode;
    this.delivery.address.address = data.delivery.address.address;
    this.delivery.address.address_detail = data.delivery.address.address_detail;
    this.delivery.address.address_street = data.delivery.address.address_street;
    this.delivery.address.address_building =
      data.delivery.address.address_building;
    this.delivery.address.address_city = data.delivery.address.address_city;
    this.delivery.address.address_state = data.delivery.address.address_state;
    this.delivery.address.logistics_type = data.delivery.address.logistics_type;
    this.delivery.memo = data.delivery.memo;

    this.payment.pay_type = data.payment.pay_type;
    this.payment.pg_type = data.payment.pg_type;
    this.payment.deliv_type = data.payment.deliv_type;
    this.payment.deliv_pay_type = data.payment.deliv_pay_type;
    this.payment.price_currency = data.payment.price_currency;
    this.payment.total_price = data.payment.total_price;
    this.payment.deliv_price = data.payment.deliv_price;

    for (let index = 0; index < data.form.length; index++) {
      const d = data.form[index];
      const form: IamwebOrderFormModel = new IamwebOrderFormModel(d);

      this.form.push(form);
    }
  }
}

export class IamwebOrderFormModel {
  type;
  title;
  desc;
  value;
  form_config_value;
  constructor(data: any) {
    this.type = data.type;
    this.title = data.title;
    this.desc = data.desc;
    this.value = data.value;
    this.form_config_value = data.form_config_value;
  }
}
