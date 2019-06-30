import sha256 from 'simple-sha256';
import { DatabaseLanguage, ControlContext, ChangeDefinition, ResourceDefinition, ResourceType } from '../../types';
import { getControlContextFromConfig } from './getControlContextFromConfig';
import { getConfig } from './getConfig';
import { initializeControlEnvironment } from './initializeControlEnvironment';
import { getStatus } from '../definitions/getStatus';
import { getUncontrolledResources } from '../definitions/getUncontrolledResources';

jest.mock('./getConfig');
const getConfigMock = getConfig as jest.Mock;
const mockedConfigResponse = {
  language: DatabaseLanguage.MYSQL,
  dialect: '__DIALECT__',
  connection: '__CONNECTION__',
  definitions: [
    new ChangeDefinition({
      path: '__PATH__',
      id: '__ID_ONE__',
      sql: '__SQL__',
      hash: sha256.sync('__SQL__'),
    }),
    new ChangeDefinition({
      path: '__PATH__',
      id: '__ID_TWO__',
      sql: '__SQL__',
      hash: sha256.sync('__SQL__'),
    }),
    new ResourceDefinition({
      path: '__PATH__',
      type: ResourceType.FUNCTION,
      name: '__NAME__',
      sql: '__SQL__',
    }),
  ],
};
getConfigMock.mockResolvedValue(mockedConfigResponse); // since typechecked by Context object

jest.mock('./initializeControlEnvironment');
const initializeControlEnvironmentMock = initializeControlEnvironment as jest.Mock;
const exampleConnection = { query: () => {}, end: () => {} };
initializeControlEnvironmentMock.mockResolvedValue({ connection: exampleConnection }); // since typechecked by Context object

jest.mock('../definitions/getStatus');
const getStatusMock = getStatus as jest.Mock;
getStatusMock.mockImplementation(({ definition }) => definition); // pass back what was given

jest.mock('../definitions/getUncontrolledResources');
const getUncontrolledResourcesMock = getUncontrolledResources as jest.Mock;
const exampleUncontrolledResource = new ResourceDefinition({
  path: '__PATH__',
  type: ResourceType.FUNCTION,
  name: '__UNCONTROLLED_NAME__',
  sql: '__SQL__',
});
getUncontrolledResourcesMock.mockResolvedValue([exampleUncontrolledResource]);

describe('getControlContextFromConfig', () => {
  beforeEach(() => jest.clearAllMocks());
  it('should get the config from the file path defined', async () => {
    await getControlContextFromConfig({ configPath: '__CONFIG_PATH__' });
    expect(getConfigMock.mock.calls.length).toEqual(1);
    expect(getConfigMock.mock.calls[0][0]).toMatchObject({
      configPath: '__CONFIG_PATH__',
    });
  });
  it('should initialize the control environment', async () => {
    await getControlContextFromConfig({ configPath: '__CONFIG_PATH__' });
    expect(initializeControlEnvironmentMock.mock.calls.length).toEqual(1);
    expect(initializeControlEnvironmentMock.mock.calls[0][0]).toMatchObject({
      config: mockedConfigResponse,
    });
  });
  it('should get the status of each definition', async () => {
    await getControlContextFromConfig({ configPath: '__CONFIG_PATH__' });
    expect(getStatusMock.mock.calls.length).toEqual(3);
    expect(getStatusMock.mock.calls[0][0]).toEqual({ connection: exampleConnection, definition: mockedConfigResponse.definitions[0] });
    expect(getStatusMock.mock.calls[1][0]).toEqual({ connection: exampleConnection, definition: mockedConfigResponse.definitions[1] });
  });
  it('should find uncontrolled resources accurately if strict', async () => {
    getConfigMock.mockResolvedValue({ ...mockedConfigResponse, strict: true });
    await getControlContextFromConfig({ configPath: '__CONFIG_PATH__' });
    expect(getUncontrolledResourcesMock.mock.calls.length).toEqual(1);
    expect(getUncontrolledResourcesMock.mock.calls[0][0]).toEqual({
      connection: exampleConnection,
      controlledResources: [mockedConfigResponse.definitions[2]], // it should only pass ResourceDefinition objects and we know this one is a resource def
    });
  });
  it('should return a control context', async () => {
    getConfigMock.mockResolvedValueOnce({ language: DatabaseLanguage.MYSQL, dialect: '__DIALECT__', connection: '__CONNECTION__', definitions: [] }); // since typechecked by Context object
    initializeControlEnvironmentMock.mockResolvedValueOnce({ query: () => {}, end: () => {} }); // since typechecked by Context object
    const result = await getControlContextFromConfig({ configPath: '__CONFIG_PATH__' });
    expect(result.constructor).toEqual(ControlContext);
  });
  it('should add uncontrolled resources to the definitions if strict', async () => {
    getConfigMock.mockResolvedValue({ ...mockedConfigResponse, strict: true });
    const result = await getControlContextFromConfig({ configPath: '__CONFIG_PATH__' });
    expect(result.definitions).toContain(exampleUncontrolledResource);
  });
  it('should not add uncontrolled resources to the definitions if not strict', async () => {
    getConfigMock.mockResolvedValue({ ...mockedConfigResponse, strict: false });
    const result = await getControlContextFromConfig({ configPath: '__CONFIG_PATH__' });
    expect(result.definitions).not.toContain(exampleUncontrolledResource);
  });
});
