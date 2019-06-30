import { ResourceType, DatabaseConnection } from '../../../types';
import { getResourceFromDatabase } from '../_utils/getResourceFromDatabase';

/*
  1. check existance of all supported resource types
    - tables
    - functions
    - sprocs
*/
export const pullResources = async ({ connection }: { connection: DatabaseConnection }) => {
  // 1. get table resource definitions
  const [showTableRows] = await connection.query({ sql: 'SHOW TABLES;' });
  const tableNames: string[] = showTableRows
    .map((result: any) => Object.values(result)[0]) // cast from form TextRow { Tables_in_superimportantdb: 'data_source' },
    .filter((tableName: string) => tableName !== 'schema_control_change_log');
  const tables = await Promise.all(tableNames.map(tableName => getResourceFromDatabase({
    connection,
    resourceType: ResourceType.TABLE,
    resourceName: tableName,
  })));

  // 2. get function definitions
  const [showFunctionRows] = await connection.query({ sql: 'SHOW FUNCTION STATUS WHERE Db = DATABASE();' });
  const functionNames: string[] = showFunctionRows.map((result: any) => result.Name);
  const functions = await Promise.all(functionNames.map(functionName => getResourceFromDatabase({
    connection,
    resourceType: ResourceType.FUNCTION,
    resourceName: functionName,
  })));

  // 3. get function definitions
  const [showProcedureRows] = await connection.query({ sql: 'SHOW PROCEDURE STATUS WHERE Db = DATABASE();' });
  const procedureNames: string[] = showProcedureRows.map((result: any) => result.Name);
  const procedures = await Promise.all(procedureNames.map(procedureName => getResourceFromDatabase({
    connection,
    resourceType: ResourceType.PROCEDURE,
    resourceName: procedureName,
  })));

  // 3. return all merged
  return [...tables, ...functions, ...procedures];
};