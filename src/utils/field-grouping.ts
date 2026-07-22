export type FieldGroupKey =
  | 'primary'
  | 'context'
  | 'settings'
  | 'additional'
  | 'relations'
  | 'audit'

export interface FieldGroup<T> {
  key: FieldGroupKey
  title: string
  description: string
  entries: Array<[string, T]>
}

const GROUP_META: Record<FieldGroupKey, { title: string; description: string; order: number }> = {
  primary: {
    title: 'Informasi Utama',
    description: 'Identitas dan informasi pokok data.',
    order: 10,
  },
  context: {
    title: 'Konteks & Kepemilikan',
    description: 'Perusahaan, lokasi, organisasi, dan referensi terkait.',
    order: 20,
  },
  settings: {
    title: 'Status & Pengaturan',
    description: 'Status, aturan, dan konfigurasi data.',
    order: 30,
  },
  additional: {
    title: 'Keterangan Tambahan',
    description: 'Kontak, alamat, catatan, dan informasi pelengkap.',
    order: 40,
  },
  relations: {
    title: 'Rincian & Data Terkait',
    description: 'Daftar rincian atau hubungan dengan data lainnya.',
    order: 50,
  },
  audit: {
    title: 'Informasi Sistem',
    description: 'Riwayat pembuatan dan perubahan data.',
    order: 60,
  },
}

type GroupCopy = Partial<Record<FieldGroupKey, { title: string; description: string }>>

const CONTEXT_GROUP_COPY: Array<{ match: RegExp; copy: GroupCopy }> = [
  {
    match: /(item-?uom|uom-?conversion|itemuomconversion)/i,
    copy: {
      primary: { title: 'Nilai Konversi', description: 'Nilai pengali antar satuan barang.' },
      context: {
        title: 'Satuan yang Dikonversi',
        description: 'Barang, satuan asal, dan satuan hasil.',
      },
      settings: { title: 'Status Konversi', description: 'Status penggunaan aturan konversi.' },
      additional: {
        title: 'Keterangan Konversi',
        description: 'Informasi pelengkap aturan konversi.',
      },
    },
  },
  {
    match: /(item-?part-?numbers?|itempartnumber|nomor part barang)/i,
    copy: {
      primary: { title: 'Identitas Part Number', description: 'Nomor part dan barcode barang.' },
      context: {
        title: 'Barang Pemilik Part',
        description: 'Barang yang menggunakan part number ini.',
      },
      settings: { title: 'Status Part Number', description: 'Status dan prioritas part number.' },
      additional: {
        title: 'Keterangan Part Number',
        description: 'Informasi pelengkap part number.',
      },
      audit: { title: 'Riwayat Part Number', description: 'Pembuatan dan perubahan part number.' },
    },
  },
  {
    match: /(item-?requests?|itemrequest|permintaan barang)/i,
    copy: {
      primary: {
        title: 'Kebutuhan Permintaan',
        description: 'Tanggal kebutuhan dan prioritas permintaan.',
      },
      context: { title: 'Gudang Peminta', description: 'Gudang yang membutuhkan barang.' },
      settings: { title: 'Status Permintaan', description: 'Status dan aturan proses permintaan.' },
      additional: {
        title: 'Catatan Permintaan',
        description: 'Keterangan tambahan permintaan barang.',
      },
      relations: {
        title: 'Daftar Barang Diminta',
        description: 'Barang dan jumlah yang dibutuhkan.',
      },
      audit: { title: 'Riwayat Permintaan', description: 'Pembuatan dan perubahan permintaan.' },
    },
  },
  {
    match: /pengambilan langsung/i,
    copy: {
      primary: { title: 'Informasi Pengambilan', description: 'Referensi dan pengguna barang.' },
      context: {
        title: 'Sumber & Penerima Barang',
        description: 'Gudang sumber dan pihak penerima barang.',
      },
      settings: { title: 'Jenis Pengambilan', description: 'Mode dan tipe penggunaan barang.' },
      additional: { title: 'Catatan Pengambilan', description: 'Keterangan penyerahan barang.' },
      relations: {
        title: 'Barang yang Diambil',
        description: 'Barang dan jumlah yang diserahkan langsung.',
      },
      audit: { title: 'Riwayat Pengambilan', description: 'Pembuatan dan perubahan pengambilan.' },
    },
  },
  {
    match: /(item-?usages?|pengeluaran berdasarkan permintaan)/i,
    copy: {
      primary: { title: 'Informasi Pengeluaran', description: 'Referensi dan pengguna barang.' },
      context: {
        title: 'Permintaan, Gudang & Penerima',
        description: 'Sumber permintaan, gudang, dan penerima barang.',
      },
      settings: { title: 'Jenis Pengeluaran', description: 'Mode dan tipe penggunaan barang.' },
      additional: { title: 'Catatan Pengeluaran', description: 'Keterangan pengeluaran barang.' },
      relations: {
        title: 'Barang yang Dikeluarkan',
        description: 'Barang dan jumlah yang dikeluarkan.',
      },
      audit: { title: 'Riwayat Pengeluaran', description: 'Pembuatan dan perubahan pengeluaran.' },
    },
  },
  {
    match: /direct-?asset-?assignment/i,
    copy: {
      context: {
        title: 'Penerima Tanggung Jawab',
        description: 'Karyawan, divisi, lokasi, atau kendaraan penerima aset.',
      },
      settings: {
        title: 'Waktu & Kondisi Penugasan',
        description: 'Tanggal, kondisi, dan rencana pengembalian aset.',
      },
      additional: {
        title: 'Catatan Serah Terima',
        description: 'Keterangan penyerahan aset kepada penerima.',
      },
    },
  },
  {
    match: /(direct-?asset|asset-?direct|aset langsung)/i,
    copy: {
      primary: { title: 'Identitas Aset', description: 'Nomor seri, label aset, dan kode QR.' },
      context: {
        title: 'Barang, Lokasi & Supplier',
        description: 'Barang sumber, lokasi penempatan, dan supplier.',
      },
      settings: {
        title: 'Perolehan & Kondisi',
        description: 'Sumber perolehan dan kondisi awal aset.',
      },
      additional: {
        title: 'Nilai, Garansi & Dokumen',
        description: 'Nilai perolehan, masa manfaat, garansi, dan faktur.',
      },
      relations: {
        title: 'Penugasan Awal',
        description: 'Penerima tanggung jawab aset setelah registrasi.',
      },
      audit: { title: 'Riwayat Aset', description: 'Pembuatan dan perubahan aset.' },
    },
  },
  {
    match: /(^|\s)roles?\b/i,
    copy: {
      primary: { title: 'Identitas Peran', description: 'Kode dan nama peran.' },
      additional: {
        title: 'Keterangan Peran',
        description: 'Tujuan dan cakupan penggunaan peran.',
      },
      relations: { title: 'Izin Peran', description: 'Daftar izin yang dimiliki peran.' },
      audit: { title: 'Riwayat Peran', description: 'Pembuatan dan perubahan peran.' },
    },
  },
  {
    match: /(category-?groups?|categorygroup)/i,
    copy: {
      primary: {
        title: 'Identitas Kelompok Kategori',
        description: 'Kode dan nama kelompok kategori.',
      },
      settings: {
        title: 'Status Kelompok Kategori',
        description: 'Status penggunaan kelompok kategori.',
      },
      additional: {
        title: 'Keterangan Kelompok Kategori',
        description: 'Informasi pelengkap kelompok kategori.',
      },
      relations: {
        title: 'Kategori dalam Kelompok',
        description: 'Kategori yang menjadi anggota kelompok ini.',
      },
      audit: {
        title: 'Riwayat Kelompok Kategori',
        description: 'Pembuatan dan perubahan kelompok kategori.',
      },
    },
  },
  {
    match: /^(purchase-?orders?)\b/i,
    copy: {
      primary: { title: 'Informasi Pesanan', description: 'Tanggal dan informasi utama pesanan.' },
      context: { title: 'Supplier & Gudang', description: 'Pemasok dan gudang tujuan pesanan.' },
      settings: { title: 'Ketentuan Pesanan', description: 'Mata uang dan pengaturan pesanan.' },
      relations: { title: 'Daftar Barang', description: 'Barang yang dipesan kepada supplier.' },
      additional: { title: 'Catatan Pesanan', description: 'Keterangan tambahan untuk pesanan.' },
      audit: { title: 'Riwayat Pesanan', description: 'Pembuatan dan perubahan pesanan.' },
    },
  },
  {
    match: /^(location-?types?)\b/i,
    copy: {
      primary: { title: 'Identitas Tipe Lokasi', description: 'Kode dan nama tipe lokasi.' },
      settings: { title: 'Status Tipe Lokasi', description: 'Status penggunaan tipe lokasi.' },
      additional: {
        title: 'Keterangan Tipe Lokasi',
        description: 'Informasi pelengkap tipe lokasi.',
      },
    },
  },
  {
    match: /^(locations?)\b/i,
    copy: {
      primary: { title: 'Identitas Lokasi', description: 'Kode dan nama lokasi.' },
      context: {
        title: 'Struktur & Kepemilikan',
        description: 'Perusahaan, tipe, induk, dan pemilik lokasi.',
      },
      settings: { title: 'Status Lokasi', description: 'Status operasional lokasi.' },
      additional: { title: 'Alamat & Keterangan', description: 'Alamat dan informasi lokasi.' },
      relations: { title: 'Wilayah Terkait', description: 'Data turunan dan relasi lokasi.' },
    },
  },
  {
    match: /^(warehouses?)\b/i,
    copy: {
      primary: { title: 'Identitas Gudang', description: 'Kode dan nama gudang.' },
      context: { title: 'Penempatan Gudang', description: 'Lokasi tempat gudang berada.' },
      settings: { title: 'Status Gudang', description: 'Status operasional gudang.' },
      additional: { title: 'Keterangan Gudang', description: 'Informasi pelengkap gudang.' },
    },
  },
  {
    match: /^(vehicles?)\b/i,
    copy: {
      primary: { title: 'Identitas Kendaraan', description: 'Kode, nama, dan nomor polisi.' },
      context: { title: 'Penempatan Kendaraan', description: 'Lokasi dan divisi kendaraan.' },
      settings: {
        title: 'Spesifikasi & Status',
        description: 'Jenis, model, tahun, dan status kendaraan.',
      },
      additional: { title: 'Keterangan Kendaraan', description: 'Informasi tambahan kendaraan.' },
    },
  },
  {
    match: /^(item-?suppliers?)\b/i,
    copy: {
      primary: {
        title: 'Informasi Item Supplier',
        description: 'Kode dan harga item dari supplier.',
      },
      context: { title: 'Item & Supplier', description: 'Hubungan barang dengan pemasok.' },
      settings: { title: 'Prioritas & Status', description: 'Supplier utama dan status hubungan.' },
      additional: { title: 'Catatan Supplier', description: 'Keterangan tambahan item supplier.' },
    },
  },
  {
    match: /^(items?)\b/i,
    copy: {
      primary: { title: 'Identitas Barang', description: 'Kode, nama, dan karakteristik barang.' },
      context: { title: 'Klasifikasi & Satuan', description: 'Kategori, merek, dan satuan dasar.' },
      settings: {
        title: 'Kontrol Persediaan & Aset',
        description: 'Tracking, stok minimum, dan pengaturan aset.',
      },
      additional: {
        title: 'Spesifikasi & Keterangan',
        description: 'Ukuran dan informasi tambahan barang.',
      },
      relations: {
        title: 'Data Pendukung Barang',
        description: 'Part number, supplier, dan relasi barang.',
      },
    },
  },
  {
    match: /^(users?)\b/i,
    copy: {
      primary: { title: 'Identitas Pengguna', description: 'Nama, NIB, dan informasi akun.' },
      context: {
        title: 'Akses Organisasi',
        description: 'Perusahaan, lokasi, kelompok kategori, dan peran.',
      },
      settings: { title: 'Status Akun', description: 'Status dan pengaturan akun pengguna.' },
      relations: {
        title: 'Peran & Hak Akses',
        description: 'Cakupan akses yang diberikan kepada pengguna.',
      },
      audit: { title: 'Riwayat Akun', description: 'Pembuatan dan pembaruan akun.' },
    },
  },
]

function copyForContext(context?: string): GroupCopy {
  if (!context) return {}
  const explicit = CONTEXT_GROUP_COPY.find((profile) => profile.match.test(context))?.copy
  if (explicit) return explicit
  const readable = context
    .replace(/^dto\./i, '')
    .replace(/^(Create|Update|Find|Detail)/i, '')
    .replace(/(Request|Response|Payload|DTO)$/i, '')
    .replace(/^[a-z0-9-]+\s+/i, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const entity = readable || 'Data'
  return {
    primary: {
      title: `Informasi ${entity}`,
      description: `Informasi pokok ${entity.toLocaleLowerCase('id-ID')}.`,
    },
    context: {
      title: `Referensi ${entity}`,
      description: `Penempatan dan data acuan ${entity.toLocaleLowerCase('id-ID')}.`,
    },
    settings: {
      title: `Pengaturan ${entity}`,
      description: `Status dan aturan ${entity.toLocaleLowerCase('id-ID')}.`,
    },
    additional: {
      title: `Keterangan ${entity}`,
      description: `Informasi pelengkap ${entity.toLocaleLowerCase('id-ID')}.`,
    },
    relations: {
      title: `Rincian ${entity}`,
      description: `Daftar rincian dan hubungan ${entity.toLocaleLowerCase('id-ID')}.`,
    },
    audit: {
      title: `Riwayat ${entity}`,
      description: `Pembuatan dan perubahan ${entity.toLocaleLowerCase('id-ID')}.`,
    },
  }
}

function contextualFieldGroup(
  context: string | undefined,
  key: string,
  value?: unknown,
): FieldGroupKey {
  const source = String(context ?? '').toLocaleLowerCase('id-ID')
  const name = normalized(key)

  if (/(category-?groups?|categorygroup)/i.test(source)) {
    if (/^category_group_(code|name)$/.test(name)) return 'primary'
    if (/^(category_ids|categories)$/.test(name)) return 'relations'
  }
  if (/(item-?part-?numbers?|itempartnumber|nomor part barang)/i.test(source)) {
    if (/^(part_number|barcode)$/.test(name)) return 'primary'
    if (name === 'item_id') return 'context'
  }
  if (/(item-?requests?|itemrequest|permintaan barang)/i.test(source)) {
    if (/^(needed_date|priority)$/.test(name)) return 'primary'
    if (name === 'requester_warehouse_id') return 'context'
    if (name === 'lines') return 'relations'
  }
  if (/(item-?usages?|pengeluaran berdasarkan permintaan|pengambilan langsung)/i.test(source)) {
    if (/^(reference_no|used_by|asset_no)$/.test(name)) return 'primary'
    if (/^(lines)$/.test(name)) return 'relations'
    if (/^(issue_mode|usage_type)$/.test(name)) return 'settings'
  }
  if (/(direct-?asset|asset-?direct|aset langsung)/i.test(source)) {
    if (/direct-?asset-?assignment/i.test(source)) {
      if (/^responsibility_/.test(name)) return 'context'
      if (/^(assigned_at|expected_return_at|assigned_condition)$/.test(name)) return 'settings'
      if (name === 'handover_notes') return 'additional'
    }
    if (/^(serial_no|asset_tag|qr_code)$/.test(name)) return 'primary'
    if (/^(item_id|part_id|uom_id|location_id|supplier_id)$/.test(name)) return 'context'
    if (/^(acquisition_type|asset_condition)$/.test(name)) return 'settings'
    if (
      /^(purchase_date|purchase_cost|warranty_expired_at|useful_life_months|invoice_no|notes)$/.test(
        name,
      )
    )
      return 'additional'
  }
  if (/(^|\s)roles?\b/i.test(source)) {
    if (/^(code|name)$/.test(name)) return 'primary'
    if (/^(permissions|permission_ids)$/.test(name)) return 'relations'
  }
  if (/(item-?uom|uom-?conversion|itemuomconversion)/i.test(source)) {
    if (name === 'multiplier') return 'primary'
    if (/^(item_id|from_uom_id|to_uom_id)$/.test(name)) return 'context'
  }
  if (/(location-?types?)/i.test(source) && /^location_type_(code|name)$/.test(name)) {
    return 'primary'
  }
  if (/(^|\s)locations?\b/i.test(source) && /^location_(code|name)$/.test(name)) {
    return 'primary'
  }
  if (/(^|\s)warehouses?\b/i.test(source) && /^warehouse_(code|name)$/.test(name)) {
    return 'primary'
  }
  if (/(^|\s)vehicles?\b/i.test(source) && /^(vehicle_(code|name)|registration_no)$/.test(name)) {
    return 'primary'
  }
  if (/(^|\s)items?\b/i.test(source) && /^item_(code|name)$/.test(name)) {
    return 'primary'
  }
  if (
    /(item-?suppliers?)/i.test(source) &&
    /^(supplier_item_code|last_purchase_price)$/.test(name)
  ) {
    return 'primary'
  }
  if (/(^|\s)users?\b/i.test(source) && /^(nib|full_name|email|password)$/.test(name)) {
    return 'primary'
  }
  return fieldGroupKey(key, value)
}

function normalized(key: string): string {
  return key.trim().toLocaleLowerCase('id-ID')
}

export function fieldGroupKey(key: string, value?: unknown): FieldGroupKey {
  const name = normalized(key)
  if (Array.isArray(value) || (value !== null && typeof value === 'object')) return 'relations'
  if (
    /(^|_)(created|updated|deleted|approved|rejected|posted|processed)_(at|by|by_name)$/.test(
      name,
    ) ||
    /^(created|updated|deleted|approved|rejected|posted|processed)_(at|by|by_name)$/.test(name)
  )
    return 'audit'
  if (
    /(^|_)(company|location|warehouse|category|category_group|division|department|employee|supplier|brand|uom|role|permission|owner|parent|requester|responsibility|vehicle)(_|$)/.test(
      name,
    ) ||
    /(_id|_ids)$/.test(name)
  )
    return 'context'
  if (
    /(^status$|_status$|^is_|^has_|^requires_|^scope_|^priority$|_mode$|_type$|^tracking_|^currency_)/.test(
      name,
    )
  )
    return 'settings'
  if (
    /(address|alamat|description|deskripsi|notes|catatan|remark|contact|phone|email|website|npwp|attachment|reason)/.test(
      name,
    )
  )
    return 'additional'
  return 'primary'
}

export function groupFieldEntries<T>(
  entries: Array<[string, T]>,
  valueOf?: (key: string, value: T) => unknown,
  context?: string,
): FieldGroup<T>[] {
  const grouped = new Map<FieldGroupKey, Array<[string, T]>>()
  for (const entry of entries) {
    const group = contextualFieldGroup(context, entry[0], valueOf?.(entry[0], entry[1]))
    grouped.set(group, [...(grouped.get(group) ?? []), entry])
  }
  const contextualCopy = copyForContext(context)
  return [...grouped.entries()]
    .map(([key, groupedEntries]) => ({
      key,
      ...GROUP_META[key],
      ...(contextualCopy[key] ?? {}),
      entries: groupedEntries,
    }))
    .sort((left, right) => left.order - right.order)
    .map(({ order: _order, ...group }) => group)
}
