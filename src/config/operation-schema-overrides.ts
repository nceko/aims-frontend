import type { ApiOperation, ApiSchema } from '@/types/resource'

type OperationOverride = Partial<ApiOperation> & { body?: ApiSchema | null }

const deliveryLineSchema: ApiSchema = {
  type: 'object',
  required: ['delivery_line_id', 'qty'],
  properties: {
    delivery_line_id: { type: 'integer' },
    qty: { type: 'number', minimum: 0.000001 },
  },
}

const deliveryConfirmationSchema: ApiSchema = {
  type: 'object',
  required: ['lines'],
  properties: {
    lines: { type: 'array', items: deliveryLineSchema },
    notes: { type: 'string' },
  },
}

export const operationSchemaOverrides: Record<string, OperationOverride> = {
  SetUserAccess: {
    body: {
      type: 'object',
      properties: {
        system_role_ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
        companies: {
          type: 'array',
          items: {
            type: 'object',
            required: ['company_id'],
            properties: {
              company_id: { type: 'integer' },
              is_default: { type: 'boolean' },
              scope_mode: { type: 'string', enum: ['COMPANY', 'LOCATION_TREE'] },
              location_ids: { type: 'array', items: { type: 'integer' } },
              category_groups: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['category_group_id'],
                  properties: {
                    category_group_id: { type: 'integer' },
                    is_default: { type: 'boolean' },
                    role_ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  CreateItemUsage: {
    body: {
      type: 'object',
      properties: {
        source_request_id: { type: 'integer' },
        issue_mode: { type: 'string', enum: ['REQUEST', 'DIRECT'], default: 'REQUEST' },
        lines: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              request_line_id: { type: 'integer' },
            },
          },
        },
      },
    },
  },
  UpdateItemUsage: {
    body: {
      type: 'object',
      properties: {
        source_request_id: { type: 'integer' },
        issue_mode: { type: 'string', enum: ['REQUEST', 'DIRECT'], default: 'REQUEST' },
        lines: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              request_line_id: { type: 'integer' },
            },
          },
        },
      },
    },
  },
  ConfirmDeliveryOrderPicking: { body: deliveryConfirmationSchema },
  ConfirmDeliveryOrderPacking: { body: deliveryConfirmationSchema },
  CompleteDisposal: {
    body: {
      type: 'object',
      properties: { disposal_date: { type: 'string', format: 'date-time' } },
    },
  },
  ReportLoss: {
    body: {
      type: 'object',
      properties: { loss_date: { type: 'string', format: 'date-time' } },
    },
  },
  ApproveComplaintReturn: {
    body: {
      type: 'object',
      required: ['lines'],
      properties: {
        lines: {
          type: 'array',
          items: {
            type: 'object',
            required: ['complaint_line_id', 'approved_qty', 'action_type'],
            properties: {
              complaint_line_id: { type: 'integer' },
              approved_qty: { type: 'number', minimum: 0.000001 },
              action_type: {
                type: 'string',
                enum: ['RETURN', 'REPLACE', 'REPAIR', 'ACCEPT_AS_IS'],
              },
            },
          },
        },
        resolution_notes: { type: 'string' },
      },
    },
  },
  RegisterComplaintReturn: {
    body: {
      type: 'object',
      required: ['return_reference_no'],
      properties: {
        return_reference_no: { type: 'string' },
        shipped_at: { type: 'string', format: 'date-time' },
        notes: { type: 'string' },
      },
    },
  },
  StartComplaintReplacement: {
    body: {
      type: 'object',
      properties: {
        replacement_reference_no: { type: 'string' },
        notes: { type: 'string' },
      },
    },
  },
  MarkComplaintReplacementShipped: {
    body: {
      type: 'object',
      required: ['replacement_reference_no'],
      properties: {
        replacement_reference_no: { type: 'string' },
        shipped_at: { type: 'string', format: 'date-time' },
        notes: { type: 'string' },
      },
    },
  },
  ConfirmComplaintReplacement: {
    body: {
      type: 'object',
      properties: {
        replacement_receipt_id: { type: 'integer' },
        received_at: { type: 'string', format: 'date-time' },
        resolution_notes: { type: 'string' },
      },
    },
  },
}
