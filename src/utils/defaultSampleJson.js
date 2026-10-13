export const DEFAULT_SAMPLE_JSON = {
  "id": "ORG-2026-001",
  "name": "Global Engineering Systems",
  "metadata": {
    "version": "2.4.1",
    "environment": "production",
    "createdAt": "2026-10-14T00:30:00Z",
    "updatedAt": "2026-10-14T00:45:00Z",
    "tags": ["engineering", "manufacturing", "automation"],
    "settings": {
      "debug": false,
      "maxDepth": 12,
      "features": {
        "nestedItems": true,
        "validation": true,
        "search": true,
        "export": {
          "json": true,
          "csv": true,
          "xml": false
        }
      }
    }
  },
  "users": [
    {
      "userId": "USR-001",
      "name": "Arjun Sharma",
      "email": "arjun@example.com",
      "active": true,
      "roles": ["admin", "engineer"],
      "profile": {
        "department": "Research",
        "location": {
          "country": "India",
          "state": "Karnataka",
          "city": "Bengaluru",
          "office": {
            "building": "Innovation Tower",
            "floor": 8,
            "desk": {
              "zone": "A3",
              "number": 42
            }
          }
        },
        "preferences": {
          "theme": "dark",
          "notifications": {
            "email": true,
            "push": false,
            "channels": [
              {
                "type": "email",
                "enabled": true,
                "events": ["alerts", "reports"]
              },
              {
                "type": "push",
                "enabled": false,
                "events": ["mentions"]
              }
            ]
          }
        }
      }
    },
    {
      "userId": "USR-002",
      "name": "Priya Nair",
      "email": "priya@example.com",
      "active": true,
      "roles": ["developer"],
      "profile": {
        "department": "Software",
        "location": {
          "country": "India",
          "state": "Tamil Nadu",
          "city": "Chennai"
        },
        "preferences": {
          "theme": "light",
          "notifications": {
            "email": false,
            "push": true
          }
        }
      }
    }
  ],
  "projects": [
    {
      "projectId": "PRJ-100",
      "name": "Smart Manufacturing Platform",
      "status": "in_progress",
      "budget": 1250000.75,
      "owner": {
        "userId": "USR-001",
        "name": "Arjun Sharma"
      },
      "items": [
        {
          "itemId": "ITEM-001",
          "name": "Control System",
          "type": "assembly",
          "quantity": 2,
          "attributes": {
            "material": "Aluminium",
            "weight": 18.5,
            "dimensions": {
              "length": 120,
              "width": 80,
              "height": 45,
              "unit": "cm"
            }
          },
          "items": [
            {
              "itemId": "SUB-001",
              "name": "Control Board",
              "type": "component",
              "quantity": 1,
              "status": "released",
              "items": [
                {
                  "itemId": "PART-001",
                  "name": "Processor",
                  "type": "part",
                  "quantity": 1,
                  "properties": {
                    "manufacturer": "Acme Electronics",
                    "partNumber": "CPU-X900",
                    "voltage": 3.3,
                    "compatible": true
                  },
                  "items": [
                    {
                      "itemId": "MICRO-001",
                      "name": "Processing Core",
                      "type": "micro_component",
                      "quantity": 4,
                      "metadata": {
                        "revision": "B",
                        "serializable": true,
                        "notes": null
                      },
                      "items": []
                    }
                  ]
                },
                {
                  "itemId": "PART-002",
                  "name": "Memory Module",
                  "type": "part",
                  "quantity": 2,
                  "properties": {
                    "manufacturer": "MemoryWorks",
                    "capacityGB": 16,
                    "frequencyMHz": 3200
                  },
                  "items": []
                }
              ]
            },
            {
              "itemId": "SUB-002",
              "name": "Power Supply",
              "type": "component",
              "quantity": 1,
              "status": "under_review",
              "items": [
                {
                  "itemId": "PART-003",
                  "name": "Voltage Regulator",
                  "type": "part",
                  "quantity": 3,
                  "properties": {
                    "inputVoltage": 12,
                    "outputVoltage": 5,
                    "efficiency": 0.94
                  },
                  "items": []
                }
              ]
            }
          ]
        },
        {
          "itemId": "ITEM-002",
          "name": "Cooling Assembly",
          "type": "assembly",
          "quantity": 1,
          "attributes": {
            "material": "Steel",
            "weight": 7.2,
            "waterResistant": false
          },
          "items": [
            {
              "itemId": "SUB-003",
              "name": "Cooling Fan",
              "type": "component",
              "quantity": 2,
              "speedRPM": 2400,
              "items": [
                {
                  "itemId": "PART-004",
                  "name": "Fan Motor",
                  "type": "part",
                  "quantity": 1,
                  "voltage": 24,
                  "items": []
                },
                {
                  "itemId": "PART-005",
                  "name": "Fan Blade",
                  "type": "part",
                  "quantity": 5,
                  "material": "Composite",
                  "items": []
                }
              ]
            }
          ]
        }
      ],
      "milestones": [
        {
          "name": "Design",
          "completed": true,
          "tasks": [
            {
              "taskId": "TASK-001",
              "title": "Create CAD models",
              "completed": true,
              "assignees": ["USR-001", "USR-002"]
            },
            {
              "taskId": "TASK-002",
              "title": "Validate dimensions",
              "completed": true,
              "assignees": ["USR-002"]
            }
          ]
        },
        {
          "name": "Testing",
          "completed": false,
          "tasks": [
            {
              "taskId": "TASK-003",
              "title": "Thermal stress testing",
              "completed": false,
              "assignees": ["USR-001"],
              "subtasks": [
                {
                  "title": "Configure sensors",
                  "completed": true
                },
                {
                  "title": "Run thermal cycles",
                  "completed": false,
                  "attempts": 2
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "projectId": "PRJ-200",
      "name": "Inventory Automation",
      "status": "planned",
      "budget": 85000,
      "owner": {
        "userId": "USR-002",
        "name": "Priya Nair"
      },
      "items": [
        {
          "itemId": "ITEM-003",
          "name": "Barcode Scanner",
          "type": "device",
          "quantity": 12,
          "specifications": {
            "resolution": 1080,
            "wireless": true,
            "supportedFormats": ["QR", "Code128", "EAN13"]
          },
          "items": [
            {
              "itemId": "PART-006",
              "name": "Optical Sensor",
              "type": "part",
              "quantity": 1,
              "calibration": {
                "required": true,
                "lastCalibrated": "2026-09-20",
                "nextCalibration": "2027-03-20"
              },
              "items": []
            }
          ]
        }
      ]
    }
  ],
  "inventory": {
    "warehouses": [
      {
        "warehouseId": "WH-001",
        "name": "Bengaluru Central",
        "items": [
          {
            "sku": "SKU-1001",
            "name": "Processor",
            "quantity": 240,
            "locations": [
              {
                "aisle": "A",
                "rack": 3,
                "bins": [
                  {
                    "binId": "BIN-001",
                    "quantity": 100,
                    "condition": "new"
                  },
                  {
                    "binId": "BIN-002",
                    "quantity": 140,
                    "condition": "new"
                  }
                ]
              }
            ]
          },
          {
            "sku": "SKU-1002",
            "name": "Memory Module",
            "quantity": 85,
            "locations": []
          }
        ]
      }
    ]
  },
  "transactions": [
    {
      "transactionId": "TXN-001",
      "type": "purchase",
      "amount": 12500.5,
      "currency": "INR",
      "successful": true,
      "details": {
        "payment": {
          "method": "credit_card",
          "provider": "ExampleBank",
          "reference": "PAY-92831"
        },
        "lineItems": [
          {
            "description": "Processor",
            "quantity": 2,
            "unitPrice": 5000,
            "tax": {
              "rate": 0.18,
              "amount": 1800
            }
          },
          {
            "description": "Memory Module",
            "quantity": 1,
            "unitPrice": 700,
            "tax": {
              "rate": 0.18,
              "amount": 126
            }
          }
        ]
      }
    },
    {
      "transactionId": "TXN-002",
      "type": "refund",
      "amount": 500,
      "currency": "INR",
      "successful": false,
      "details": {
        "reason": "Duplicate transaction",
        "attempts": [
          {
            "attempt": 1,
            "status": "rejected",
            "code": "BANK_TIMEOUT"
          },
          {
            "attempt": 2,
            "status": "pending",
            "code": null
          }
        ]
      }
    }
  ],
  "analytics": {
    "summary": {
      "totalProjects": 2,
      "totalUsers": 2,
      "totalInventoryItems": 325,
      "utilization": 0.78
    },
    "metrics": [
      {
        "metric": "project_completion",
        "value": 67.5,
        "unit": "percent",
        "history": [
          {
            "date": "2026-10-01",
            "value": 52.0
          },
          {
            "date": "2026-10-07",
            "value": 61.5
          },
          {
            "date": "2026-10-14",
            "value": 67.5
          }
        ]
      },
      {
        "metric": "inventory_accuracy",
        "value": 98.2,
        "unit": "percent",
        "history": []
      }
    ]
  },
  "system": {
    "health": "operational",
    "services": [
      {
        "serviceId": "SVC-001",
        "name": "Authentication",
        "healthy": true,
        "dependencies": [
          {
            "serviceId": "DB-001",
            "name": "User Database",
            "healthy": true
          }
        ]
      },
      {
        "serviceId": "SVC-002",
        "name": "Inventory API",
        "healthy": true,
        "dependencies": [
          {
            "serviceId": "DB-002",
            "name": "Inventory Database",
            "healthy": true
          },
          {
            "serviceId": "SVC-003",
            "name": "Notification Service",
            "healthy": false,
            "error": {
              "code": "SMTP_UNAVAILABLE",
              "message": "Email provider is temporarily unreachable",
              "retryable": true
            }
          }
        ]
      }
    ],
    "logs": [
      {
        "timestamp": "2026-10-14T00:40:00Z",
        "level": "INFO",
        "message": "Application started"
      },
      {
        "timestamp": "2026-10-14T00:41:12Z",
        "level": "WARN",
        "message": "Notification service degraded"
      },
      {
        "timestamp": "2026-10-14T00:42:05Z",
        "level": "ERROR",
        "message": "Email delivery failed",
        "context": {
          "recipient": "user@example.com",
          "retryCount": 3,
          "metadata": {
            "source": "notification-worker",
            "queue": {
              "name": "email-events",
              "partition": 4
            }
          }
        }
      }
    ]
  },
  "miscellaneous": {
    "emptyArray": [],
    "emptyObject": {},
    "nullableValue": null,
    "booleanValue": true,
    "integerValue": 42,
    "floatValue": 3.14159,
    "stringValue": "Nested JSON testing",
    "specialCharacters": "Quotes: \"hello\", slash: /, unicode: ₹ € Ω",
    "deeplyNested": {
      "level1": {
        "level2": {
          "level3": {
            "level4": {
              "level5": {
                "level6": {
                  "level7": {
                    "level8": {
                      "level9": {
                        "level10": {
                          "message": "You reached the deepest level",
                          "items": [
                            {
                              "id": "DEEP-001",
                              "value": "Final nested object",
                              "items": []
                            }
                          ]
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

export const DEFAULT_SAMPLE_JSON_STRING = JSON.stringify(DEFAULT_SAMPLE_JSON, null, 2);
