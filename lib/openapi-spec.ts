// lib/openapi-spec.ts
export const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'PCK Ledger API',
    version: '1.0.0',
    description: 'API documentation and playground for the Project Expense & Ledger Tracking System.',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local Development Server',
    },
  ],
  paths: {
    '/api/projects': {
      get: {
        summary: 'Get all projects with their sheets',
        tags: ['Projects'],
        responses: {
          '200': {
            description: 'List of projects',
          },
        },
      },
      post: {
        summary: 'Create a new project',
        tags: ['Projects'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'company'],
                properties: {
                  name: { type: 'string', example: 'PROJECT PABRIK KONGKIE' },
                  company: { type: 'string', example: 'PT. PCK' },
                  initialSheets: {
                    type: 'array',
                    items: { type: 'string' },
                    example: ['Kas', 'Pembukuan Global'],
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Project created successfully' },
        },
      },
    },
    '/api/sheets': {
      post: {
        summary: 'Create a new sheet inside a project',
        tags: ['Sheets'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'projectId'],
                properties: {
                  name: { type: 'string', example: 'Pembukuan Gudang B' },
                  projectId: { type: 'string', example: 'cuid_here' },
                  type: {
                    type: 'string',
                    enum: ['EXPENSE_ONLY', 'DEBIT_CREDIT'],
                    default: 'DEBIT_CREDIT',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Sheet created successfully' },
        },
      },
    },
    '/api/sheets/{sheetId}': {
      get: {
        summary: 'Get sheet metadata and parent project details',
        tags: ['Sheets'],
        parameters: [
          {
            name: 'sheetId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Sheet and project details' },
        },
      },
    },
    '/api/transactions': {
      get: {
        summary: 'Get all transactions for a sheet (with dynamic Saldo calculation)',
        tags: ['Transactions'],
        parameters: [
          {
            name: 'sheetId',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'The ID of the sheet to fetch ledger entries for',
          },
        ],
        responses: {
          '200': { description: 'Chronologically sorted ledger transactions' },
        },
      },
      post: {
        summary: 'Create a single ledger transaction',
        tags: ['Transactions'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['sheetId', 'date', 'code', 'description'],
                properties: {
                  sheetId: { type: 'string' },
                  date: { type: 'string', format: 'date', example: '2026-08-07' },
                  code: { type: 'string', example: 'MT' },
                  description: { type: 'string', example: 'Material (Cat Mowilex)' },
                  debit: { type: 'number', example: 0 },
                  credit: { type: 'number', example: 744000 },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Transaction added' },
        },
      },
    },
    '/api/transactions/bulk': {
      post: {
        summary: 'Bulk import transactions from Excel parser',
        tags: ['Transactions'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['sheetId', 'transactions'],
                properties: {
                  sheetId: { type: 'string' },
                  transactions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        date: { type: 'string', example: '2026-08-05' },
                        code: { type: 'string', example: 'MT' },
                        description: { type: 'string', example: 'Material (Oxygen)' },
                        debit: { type: 'number', example: 0 },
                        credit: { type: 'number', example: 610500 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Batch inserted transactions' },
        },
      },
    },
  },
};