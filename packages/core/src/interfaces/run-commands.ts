import { AddCommandConfig } from './command/add-command';
import { BuildCommandExternalConfig } from './command/build-command';
import { CreateCommandExternalConfig } from './command/create-command';
import { InstallCommandExternalConfig } from './command/install-command';
import { PublishCommandExternalConfig } from './command/publish-command';
import { TestCommandExternalConfig } from './command/test-command';
import { VersionCommandExternalConfig } from './command/version-command';
import { ProjectExternalConfig } from './project';

/** 外部运行命令配置 dy.config.{js|ts|json} */
export interface ExternalRunCommandsConfig {
  /** 项目元信息 */
  project?: ProjectExternalConfig;
  /** 注册命令（由于项目类型存在差异，所以 commands 是动态的，比如：monorepo 项目可能需要注册 add\build\publish 等多个命令、single 项目可能只需要注册 build\publish 命令） */
  commands: {
    /** 创建项目 */
    create?: CreateCommandExternalConfig;
    /** 安装依赖 */
    install?: InstallCommandExternalConfig;
    /** 构建 */
    build?: BuildCommandExternalConfig;
    /** 测试 */
    test?: TestCommandExternalConfig;
    /** 版本控制 */
    version?: VersionCommandExternalConfig;
    /** 发布 */
    publish?: PublishCommandExternalConfig;
    /** 添加子包（monorepo 项目特有） */
    add?: Partial<AddCommandConfig>;
  };
}
