import * as shared from '@volar/shared';
import * as vscode from 'vscode-languageserver-protocol';
import type { LanguageServiceRuntimeContext } from '../types';
import { languageFeatureWorker } from '../utils/featureWorkers';
import { executePluginCommand, ExecutePluginCommandArgs } from './executeCommand';

export interface PluginCodeLensData {
	uri: string,
	originalData: any,
	pluginId: string,
}

export function register(context: LanguageServiceRuntimeContext) {

	return async (uri: string) => {

		return await languageFeatureWorker(
			context,
			uri,
			undefined,
			(arg) => [arg],
			async (plugin, document) => {

				const codeLens = await plugin.codeLens?.on?.(document);

				if (codeLens) {
					return codeLens.map<vscode.CodeLens>(item => {
						const commandArgs: ExecutePluginCommandArgs | undefined = item.command ? [uri, Object.keys(context.plugins).find(key => context.plugins[key] === plugin)!, item.command] : undefined;
						return {
							...item,
							command: item.command && commandArgs ? {
								...item.command,
								command: executePluginCommand,
								arguments: commandArgs as any,
							} : undefined,
							data: {
								uri,
								originalData: item.data,
								pluginId: Object.keys(context.plugins).find(key => context.plugins[key] === plugin)!,
							} satisfies PluginCodeLensData,
						};
					});
				}
			},
			(data, map) => data.map(codeLens => {

				if (!map)
					return codeLens;

				const range = map.toSourceRange(codeLens.range);
				if (range) {
					return {
						...codeLens,
						range,
					};
				}
			}).filter(shared.notEmpty),
			arr => arr.flat(),
		) ?? [];
	};
}
