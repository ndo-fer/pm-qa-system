import { NextResponse } from "next/server";
import { mockErpData } from "@/lib/mock-erp-data";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const moduleName = path[0];

  // Simulate network latency (200ms) if not disabled in local dev environment
  if (process.env.DISABLE_MOCK_DELAY !== "true") {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  const data = mockErpData[moduleName];

  if (!data) {
    return NextResponse.json(
      { error: `Table '${moduleName}' was not found on this instance.` },
      { status: 404 }
    );
  }

  // Handle MasProduk specific parameter rules (mirroring staging)
  if (moduleName === "MasProduk") {
    const { searchParams } = new URL(request.url);
    const jenisBaku = searchParams.get("jenisBaku");

    if (!jenisBaku) {
      return NextResponse.json(
        { error: "Bad Request: The query parameter 'jenisBaku' is mandatory for all MasProduk interactions." },
        { status: 400 }
      );
    }

    const uppercaseJenis = jenisBaku.toUpperCase();
    if (!["BAKU", "JADI", "LAIN"].includes(uppercaseJenis)) {
      return NextResponse.json(
        { error: `Bad Request: Invalid value '${jenisBaku}' for parameter 'jenisBaku'. Valid options are: BAKU, JADI, LAIN.` },
        { status: 400 }
      );
    }

    const filtered = data.filter(
      (item) => item.jenisBaku.toUpperCase() === uppercaseJenis
    );
    return NextResponse.json(filtered);
  }

  return NextResponse.json(data);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const moduleName = path[0];
  const subAction = path[1];
  const actionType = path[2]; // e.g. "baku" or "lain"

  // Simulate network latency (200ms) if not disabled in local dev environment
  if (process.env.DISABLE_MOCK_DELAY !== "true") {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  if (moduleName !== "MasProduk") {
    // Standard mock create for other tables
    const body = await request.json().catch(() => ({}));
    return NextResponse.json({ success: true, message: `Created record in ${moduleName}`, data: body });
  }

  // MasProduk validation
  // 1. Mandate 'jenisBaku' query parameter or subpath segment
  const { searchParams } = new URL(request.url);
  let jenisBaku = searchParams.get("jenisBaku");

  if (subAction === "create" && actionType) {
    jenisBaku = actionType.toUpperCase(); // e.g. "BAKU" or "LAIN"
  }

  if (!jenisBaku) {
    return NextResponse.json(
      { error: "Bad Request: The query parameter 'jenisBaku' or specific route type (baku/lain) is mandatory for MasProduk interactions." },
      { status: 400 }
    );
  }

  const uppercaseJenis = jenisBaku.toUpperCase();
  if (!["BAKU", "JADI", "LAIN"].includes(uppercaseJenis)) {
    return NextResponse.json(
      { error: `Bad Request: Invalid 'jenisBaku' value '${jenisBaku}'. Valid options are: BAKU, JADI, LAIN.` },
      { status: 400 }
    );
  }

  // 2. Validate SP_CreateProduct 24-parameter requirement (22 IN parameters from body)
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { error: "Bad Request: Missing request body." },
      { status: 400 }
    );
  }

  const missingFields: string[] = [];
  const invalidTypes: string[] = [];

  const REQUIRED_FIELDS = [
    { name: "Kode_Produk", type: "string" },
    { name: "Nama_Produk", type: "string" },
    { name: "Kode_Kategori", type: "string" },
    { name: "Minim_Qty", type: "number" },
    { name: "HPP_Standar", type: "number" },
    { name: "Aktif", type: "boolean" },
    { name: "Keterangan", type: "string" },
    { name: "Nama_Produk_Supplier", type: "string" },
    { name: "Tipe_Data", type: "string" },
    { name: "Warna", type: "string" },
    { name: "Tebal", type: "number" },
    { name: "Lebar", type: "number" },
    { name: "AZ", type: "string_or_number" }, // can be numeric in json, varchar in DB
    { name: "Yield", type: "string_or_number" },
    { name: "Slow", type: "boolean" },
    { name: "Marketing", type: "boolean_or_string" }, // p_Marketing bit, but Arfan sends string
    { name: "Minim_bhp", type: "number" },
    { name: "Minim_non", type: "number" },
    { name: "Koefisien", type: "number" },
    { name: "Toleransi", type: "number" },
    { name: "Margin", type: "number" },
    { name: "Creator", type: "string" }
  ];

  for (const field of REQUIRED_FIELDS) {
    if (!(field.name in body)) {
      missingFields.push(field.name);
      continue;
    }

    const val = body[field.name];
    if (field.type === "string" && typeof val !== "string") {
      invalidTypes.push(`${field.name} (expected string, got ${typeof val})`);
    } else if (field.type === "number" && typeof val !== "number") {
      invalidTypes.push(`${field.name} (expected number, got ${typeof val})`);
    } else if (field.type === "boolean" && typeof val !== "boolean") {
      invalidTypes.push(`${field.name} (expected boolean, got ${typeof val})`);
    } else if (field.type === "string_or_number" && typeof val !== "string" && typeof val !== "number") {
      invalidTypes.push(`${field.name} (expected string or number, got ${typeof val})`);
    } else if (field.type === "boolean_or_string" && typeof val !== "boolean" && typeof val !== "string") {
      invalidTypes.push(`${field.name} (expected boolean or string, got ${typeof val})`);
    }

    // Additional length validation based on SP parameters
    if (typeof val === "string") {
      if (field.name === "Tipe_Data" && val.length !== 1) {
        invalidTypes.push(`${field.name} length must be exactly 1 character`);
      } else if (field.name === "Kode_Produk" && val.length > 50) {
        invalidTypes.push(`${field.name} length exceeds 50 characters`);
      } else if (field.name === "Nama_Produk" && val.length > 100) {
        invalidTypes.push(`${field.name} length exceeds 100 characters`);
      } else if (field.name === "Kode_Kategori" && val.length > 50) {
        invalidTypes.push(`${field.name} length exceeds 50 characters`);
      } else if (field.name === "Keterangan" && val.length > 100) {
        invalidTypes.push(`${field.name} length exceeds 100 characters`);
      } else if (field.name === "Nama_Produk_Supplier" && val.length > 100) {
        invalidTypes.push(`${field.name} length exceeds 100 characters`);
      } else if (field.name === "Warna" && val.length > 50) {
        invalidTypes.push(`${field.name} length exceeds 50 characters`);
      } else if (field.name === "AZ" && val.length > 50) {
        invalidTypes.push(`${field.name} length exceeds 50 characters`);
      } else if (field.name === "Yield" && val.length > 50) {
        invalidTypes.push(`${field.name} length exceeds 50 characters`);
      } else if (field.name === "Creator" && val.length > 50) {
        invalidTypes.push(`${field.name} length exceeds 50 characters`);
      }
    }
  }

  // Tipe_Data value check for lain vs baku
  if (body.Tipe_Data && typeof body.Tipe_Data === "string") {
    if (uppercaseJenis === "LAIN" && !["F", "K"].includes(body.Tipe_Data.toUpperCase())) {
      invalidTypes.push("Tipe_Data must be 'F' or 'K' for LAIN product category");
    }
  }

  if (missingFields.length > 0 || invalidTypes.length > 0) {
    return NextResponse.json(
      {
        error: "Bad Request: SP_CreateProduct parameter validation failed.",
        missingParameters: missingFields,
        invalidParameters: invalidTypes,
        requiredParametersCount: 22,
        providedParametersCount: Object.keys(body).length
      },
      { status: 400 }
    );
  }

  // Mimic successful stored procedure output (p_StatusCode, p_Message)
  return NextResponse.json({
    p_StatusCode: 200,
    p_Message: `Product ${body.Kode_Produk} successfully created via SP_CreateProduct.`,
    data: {
      id: mockErpData.MasProduk.length + 1,
      productCode: body.Kode_Produk,
      name: body.Nama_Produk,
      jenisBaku: uppercaseJenis,
      unit: "Pcs",
      stock: body.Minim_Qty
    }
  }, { status: 200 });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const moduleName = path[0];

  // Simulate network latency (200ms) if not disabled in local dev environment
  if (process.env.DISABLE_MOCK_DELAY !== "true") {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  if (moduleName === "MasProduk") {
    const { searchParams } = new URL(request.url);
    const jenisBaku = searchParams.get("jenisBaku");

    if (!jenisBaku) {
      return NextResponse.json(
        { error: "Bad Request: The query parameter 'jenisBaku' is mandatory for all MasProduk interactions." },
        { status: 400 }
      );
    }
  }

  const body = await request.json().catch(() => ({}));
  return NextResponse.json({ success: true, message: `Updated record in ${moduleName}`, data: body });
}
