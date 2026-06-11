// Mock data for the 13 Staging ERP Master Tables and Product Catalog
export const mockErpData: Record<string, Array<Record<string, string | number | boolean | null | undefined>>> = {
  MasClient: [
    { id: 1, clientCode: "CL-ASTR-01", name: "PT. Astra International Tbk", type: "Corporate", status: "Active" },
    { id: 2, clientCode: "CL-INDF-02", name: "PT. Indofood Sukses Makmur Tbk", type: "Corporate", status: "Active" },
    { id: 3, clientCode: "CL-TLKM-03", name: "PT. Telkom Indonesia Tbk", type: "Government/SOE", status: "Active" },
    { id: 4, clientCode: "CL-PDJY-04", name: "PT. Pada Jaya Mandiri", type: "Internal/Affiliate", status: "Active" }
  ],
  MasControllingArea: [
    { id: 1, code: "CA-HO-01", name: "Head Office Controlling Area", currency: "IDR", fiscalYearVariant: "K4" },
    { id: 2, code: "CA-REG-02", name: "Regional East Controlling Area", currency: "IDR", fiscalYearVariant: "K4" }
  ],
  MasCompanyCode: [
    { id: 1, code: "COMP-1000", name: "PT. Pada Jaya Mandiri (Jakarta)", city: "Jakarta", country: "ID", currency: "IDR" },
    { id: 2, code: "COMP-2000", name: "PT. Pada Jaya Mandiri (Surabaya)", city: "Surabaya", country: "ID", currency: "IDR" }
  ],
  MasPlant: [
    { id: 1, code: "PL-JAK-01", name: "Jakarta Main Assembly Plant", companyCode: "COMP-1000", location: "Cikarang" },
    { id: 2, code: "PL-SBY-02", name: "Surabaya Fabrication Plant", companyCode: "COMP-2000", location: "Gresik" }
  ],
  MasStorageLocation: [
    { id: 1, code: "SL-RAW-01", name: "Raw Material Warehouse A", plantCode: "PL-JAK-01" },
    { id: 2, code: "SL-FIN-02", name: "Finished Goods Warehouse B", plantCode: "PL-JAK-01" },
    { id: 3, code: "SL-SPAR-03", name: "Spareparts and Consumables Storage", plantCode: "PL-SBY-02" }
  ],
  MasPurchasingORG: [
    { id: 1, code: "PUR-CORP", name: "Corporate Procurement Organization", plantCode: "PL-JAK-01" },
    { id: 2, code: "PUR-LOC-SBY", name: "Local Surabaya Purchasing Office", plantCode: "PL-SBY-02" }
  ],
  MasSalesORG: [
    { id: 1, code: "SLS-DOM", name: "Domestic Sales Organization", companyCode: "COMP-1000" },
    { id: 2, code: "SLS-EXP", name: "Export & International Sales Office", companyCode: "COMP-1000" }
  ],
  MasSalesDivision: [
    { id: 1, code: "DIV-STEEL", name: "Structural Steel Division" },
    { id: 2, code: "DIV-FABR", name: "Heavy Metal Fabrication Division" },
    { id: 3, code: "DIV-SERV", name: "Technical Service & Construction" }
  ],
  MasSalesChannel: [
    { id: 1, code: "CH-DIST", name: "Authorized Distributor Network" },
    { id: 2, code: "CH-RETL", name: "Direct B2B Retail / Project Sales" }
  ],
  MasSalesGroup: [
    { id: 1, code: "SG-JAK-N", name: "Jakarta North & Corporate Team" },
    { id: 2, code: "SG-JATIM", name: "Jawa Timur Sales & Project Operations" }
  ],
  MasCostCenter: [
    { id: 1, code: "CC-PROD-01", name: "Jakarta Production Fabrication Cost Center", controllingArea: "CA-HO-01" },
    { id: 2, code: "CC-ADMIN-01", name: "Head Office General Admin Cost Center", controllingArea: "CA-HO-01" }
  ],
  MasProfitCenter: [
    { id: 1, code: "PC-METALS", name: "Metals Business Unit Profit Center", segment: "Metalworking" },
    { id: 2, code: "PC-SERVICES", name: "Logistics and Construction Services", segment: "Services" }
  ],
  MasTaxGroup: [
    { id: 1, code: "TX-PPN-11", name: "Pajak Pertambahan Nilai 11%", rate: 0.11, status: "Active" },
    { id: 2, code: "TX-EXEMPT", name: "Tax Exempt / Kawasan Berikat", rate: 0.0, status: "Active" }
  ],
  MasProduk: [
    // BAKU: Raw Materials
    { id: 1, productCode: "PRD-BAKU-H150", name: "Baja H-Beam 150x150mm SS400", jenisBaku: "BAKU", unit: "Pcs", stock: 120 },
    { id: 2, productCode: "PRD-BAKU-PL12", name: "Pelat Baja Karbon Rendah 12mm", jenisBaku: "BAKU", unit: "Sheet", stock: 45 },
    { id: 3, productCode: "PRD-BAKU-BT16", name: "Besi Beton Ulir Dia. 16mm", jenisBaku: "BAKU", unit: "Length", stock: 350 },
    // JADI: Finished Goods
    { id: 4, productCode: "PRD-JADI-T5000", name: "Tangki Silo Air Industri 5000 Liter", jenisBaku: "JADI", unit: "Unit", stock: 12 },
    { id: 5, productCode: "PRD-JADI-GPRB", name: "Modul Gudang Knockdown Prefabrikasi", jenisBaku: "JADI", unit: "Set", stock: 4 },
    // LAIN: Others
    { id: 6, productCode: "PRD-LAIN-SH46", name: "Oli Mesin Hidrolik Shell Tellus S2 M46", jenisBaku: "LAIN", unit: "Drum", stock: 15 },
    { id: 7, productCode: "PRD-LAIN-EL70", name: "Kawat Las Elektroda LB-52 U Dia. 3.2mm", jenisBaku: "LAIN", unit: "Box", stock: 80 }
  ],
  MasArea: [
    { id: 1, Kode: "AR-01", Area: "Jabodetabek", Status: "Active" },
    { id: 2, Kode: "AR-02", Area: "Jawa Barat", Status: "Active" }
  ],
  MasBrand: [
    { id: 1, Kode: "BR-TATA", Brand: "Tata Steel", Status: "Active" },
    { id: 2, Kode: "BR-KRAK", Brand: "Krakatau Steel", Status: "Active" }
  ],
  MasChecker: [
    { id: 1, NoId: 1, CheckListPoint: "Ketebalan Plat Utama", Status: "Active" },
    { id: 2, NoId: 2, CheckListPoint: "Keseragaman Lapisan Warna", Status: "Active" }
  ],
  MasTebal: [
    { id: 1, Kode: "T-012", Tebal: 0.12, Status: "Active" },
    { id: 2, Kode: "T-020", Tebal: 0.20, Status: "Active" },
    { id: 3, Kode: "T-030", Tebal: 0.30, Status: "Active" }
  ],
  MasAz: [
    { id: 1, Kode: "AZ-150", Keterangan: "Coating AZ 150 gr/m2", Kelompok: "AZ", Status: "Active" },
    { id: 2, Kode: "AZ-100", Keterangan: "Coating AZ 100 gr/m2", Kelompok: "AZ", Status: "Active" }
  ],
  MasJenis: [
    { id: 1, Kode: "JN-TRUSS", Keterangan: "Baja Ringan Truss C75", Kelompok: "TRUSS", Status: "Active" },
    { id: 2, Kode: "JN-SPAN", Keterangan: "Atap Spandek Gelombang", Kelompok: "SPANDEK", Status: "Active" }
  ],
  MasMerk: [
    { id: 1, Kode: "MK-PDJ", Keterangan: "Pada Jaya Steel", Kelompok: "Lokal", Status: "Active" },
    { id: 2, Kode: "MK-BLU", Keterangan: "Bluescope Steel", Kelompok: "Import", Status: "Active" }
  ],
  MasYield: [
    { id: 1, Kode: "YD-240", Keterangan: "Yield Strength 240 MPa", Kelompok: "YS", Status: "Active" },
    { id: 2, Kode: "YD-550", Keterangan: "Yield Strength 550 MPa", Kelompok: "YS", Status: "Active" }
  ],
  MasGudang: [
    { id: 1, Kode_Gudang: "GD-RAW-01", Nama_Gudang: "Gudang Bahan Baku Utama", Aktif: 1, Keterangan: "Gudang penyimpanan coil baja utama", No_Id: 1 },
    { id: 2, Kode_Gudang: "GD-JADI-02", Nama_Gudang: "Gudang Finished Goods A", Aktif: 1, Keterangan: "Gudang produk jadi siap kirim", No_Id: 2 }
  ],
  MasKelompokWarna: [
    { id: 1, Kode: "KW-BLUE", Keterangan: "Kelompok Warna Biru", Kelompok: "Warna", IndexWarna: "B1", Status: "Active" },
    { id: 2, Kode: "KW-RED", Keterangan: "Kelompok Warna Merah", Kelompok: "Warna", IndexWarna: "R1", Status: "Active" }
  ],
  MasWarna: [
    { id: 1, Kode: "W-BLU-01", Keterangan: "Biru Bromo", Kelompok: "KW-BLUE", Kelompok2: "", Kelompok3: "", Kelompok4: "", Kelompok5: "", Kelompok6: "", Kelompok7: "", Kelompok8: "", Kelompok9: "", Kelompok10: "", Kelompok_Pu: "", Status: "Active" },
    { id: 2, Kode: "W-RED-01", Keterangan: "Merah Merapi", Kelompok: "KW-RED", Kelompok2: "", Kelompok3: "", Kelompok4: "", Kelompok5: "", Kelompok6: "", Kelompok7: "", Kelompok8: "", Kelompok9: "", Kelompok10: "", Kelompok_Pu: "", Status: "Active" }
  ],
  MasMesin: [
    { id: 1, NoMesin: "M-ROLL-01", NmMesin: "Mesin Rollforming C75", NoGlobal: "G-ROLL-01", Operator: "Ahmad", QtySatuan: 100, SatuanBarang: "Meter", Detik: 12, Status: "Active" },
    { id: 2, NoMesin: "M-SLIT-02", NmMesin: "Mesin Slitting Coil", NoGlobal: "G-SLIT-02", Operator: "Budi", QtySatuan: 50, SatuanBarang: "Kg", Detik: 8, Status: "Active" }
  ],
  MasBerat: [
    { id: 1, Kode: "B-012-B1", KodeTebal: "T-012", KodeKelompokWarna: "KW-BLUE", KodeAz: "AZ-150", Berat: 1.25, Hpp: 12000, Margin1: 0.1, Margin2: 0.15, Margin3: 0.2, Margin4: 0.25, Status: "Active" },
    { id: 2, Kode: "B-020-R1", KodeTebal: "T-020", KodeKelompokWarna: "KW-RED", KodeAz: "AZ-100", Berat: 2.10, Hpp: 18000, Margin1: 0.12, Margin2: 0.18, Margin3: 0.22, Margin4: 0.28, Status: "Active" }
  ]
};
