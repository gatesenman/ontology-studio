/** Built-in demo ontology: a small logistics domain exercising every concept kind. */
import type { Ontology } from './types.ts'

/** Returns the bundled logistics demo ontology. */
export function sampleOntology(): Ontology {
  return {
    formatVersion: 1,
    name: '物流示例本体 Logistics Demo',
    valueTypes: [
      {
        kind: 'valueType',
        id: 'vt-email',
        apiName: 'email',
        displayName: '邮箱地址',
        description: '带格式约束的邮箱字符串',
        baseType: 'string',
        pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$',
      },
      {
        kind: 'valueType',
        id: 'vt-weight',
        apiName: 'weightKg',
        displayName: '重量（千克）',
        description: '非负重量',
        baseType: 'double',
        min: 0,
      },
    ],
    objectTypes: [
      {
        kind: 'objectType',
        id: 'ot-ship',
        apiName: 'ship',
        displayName: '船舶',
        description: '运营中的货船',
        primaryKey: 'imo',
        titleProperty: 'name',
        properties: [
          { apiName: 'imo', displayName: 'IMO 编号', description: '', baseType: 'string', required: true, array: false },
          { apiName: 'name', displayName: '船名', description: '', baseType: 'string', required: true, array: false },
          { apiName: 'capacityKg', displayName: '载重（kg）', description: '', baseType: 'double', valueTypeId: 'vt-weight', required: true, array: false },
        ],
      },
      {
        kind: 'objectType',
        id: 'ot-shipment',
        apiName: 'shipment',
        displayName: '货运单',
        description: '一次货物运输',
        primaryKey: 'shipmentId',
        titleProperty: 'shipmentId',
        properties: [
          { apiName: 'shipmentId', displayName: '单号', description: '', baseType: 'string', required: true, array: false },
          { apiName: 'weightKg', displayName: '重量（kg）', description: '', baseType: 'double', valueTypeId: 'vt-weight', required: true, array: false },
          { apiName: 'delivered', displayName: '已送达', description: '', baseType: 'boolean', required: true, array: false },
        ],
      },
    ],
    linkTypes: [
      {
        kind: 'linkType',
        id: 'lt-carries',
        apiName: 'carries',
        displayName: '承运',
        description: '船舶承运货运单',
        sourceObjectTypeId: 'ot-ship',
        targetObjectTypeId: 'ot-shipment',
        cardinality: 'ONE_TO_MANY',
      },
    ],
    actionTypes: [
      {
        kind: 'actionType',
        id: 'at-deliver',
        apiName: 'markDelivered',
        displayName: '标记送达',
        description: '把货运单标记为已送达',
        parameters: [
          { apiName: 'shipmentId', displayName: '单号', baseType: 'string', required: true },
        ],
        modifies: [{ objectTypeId: 'ot-shipment', operation: 'modify' }],
        submissionCriteria: ['rule-weight'],
      },
    ],
    metrics: [
      {
        kind: 'metric',
        id: 'm-pending',
        apiName: 'pendingShipments',
        displayName: '待送达单数',
        description: '尚未送达的货运单数量',
        objectTypeId: 'ot-shipment',
        aggregation: 'count',
        filter: 'delivered == false',
      },
      {
        kind: 'metric',
        id: 'm-weight',
        apiName: 'totalWeight',
        displayName: '总重量',
        description: '全部货运单总重量',
        objectTypeId: 'ot-shipment',
        aggregation: 'sum',
        propertyApiName: 'weightKg',
      },
    ],
    rules: [
      {
        kind: 'rule',
        id: 'rule-weight',
        apiName: 'positiveWeight',
        displayName: '重量必须为正',
        description: '货运单重量必须大于 0',
        objectTypeId: 'ot-shipment',
        expression: 'weightKg > 0',
        severity: 'error',
      },
    ],
    sampleInstances: [
      { id: 'inst-1', objectTypeId: 'ot-shipment', values: { shipmentId: 'S-001', weightKg: 1200.5, delivered: false } },
      { id: 'inst-2', objectTypeId: 'ot-shipment', values: { shipmentId: 'S-002', weightKg: 80, delivered: true } },
      { id: 'inst-3', objectTypeId: 'ot-shipment', values: { shipmentId: 'S-003', weightKg: 0, delivered: false } },
      { id: 'inst-4', objectTypeId: 'ot-ship', values: { imo: 'IMO-9074729', name: '远望号', capacityKg: 50000 } },
    ],
  }
}
