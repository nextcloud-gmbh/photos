/* eslint-disable jsdoc/require-jsdoc */
/**
 * SPDX-FileCopyrightText: 2024 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { davGetClient, davGetDefaultPropfind, davResultToNode, davRootPath } from '@nextcloud/files'
import { loadState } from '@nextcloud/initial-state'
import { joinPaths } from '@nextcloud/paths'
import { showError } from '@nextcloud/dialogs'
import { emit } from '@nextcloud/event-bus'
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import axios from '@nextcloud/axios'

import logger from '../services/logger.js'

export const configChangedEvent = 'photos:user-config-changed'

export async function getFolder(path) {
	const davClient = davGetClient()
	const location = joinPaths(davRootPath, path) + '/'
	try {
		const stat = await davClient.stat(location, { details: true, data: davGetDefaultPropfind() })
		return davResultToNode(stat.data)
	} catch (error) {
		if (error.response?.status === 404) {
			logger.debug('Photo location does not exist, creating it.')
			await davClient.createDirectory(location)
			const stat = await davClient.stat(location, { details: true, data: davGetDefaultPropfind() })
			return davResultToNode(stat.data)
		} else {
			logger.fatal(error)
			showError(t('photos', 'Could not load photos folder'))
		}
	}

	throw new Error("Couldn't fetch photos upload folder")
}

/**
 * @typedef {object} UserConfigState
 * @property {boolean} croppedLayout
 * @property {string[]} photosSourceFolders
 * @property {string} photosLocation
 * @property {import('@nextcloud/files').Folder} [photosLocationFolder]
 */

/** @type {import('vuex').Module<UserConfigState, object>} */
const module = {
	state() {
		return {
			croppedLayout: loadState('photos', 'croppedLayout', 'false') === 'true',
			photosSourceFolders: JSON.parse(loadState('photos', 'photosSourceFolders', '["/Photos"]')),
			photosLocation: loadState('photos', 'photosLocation', ''),
			photosLocationFolder: undefined,
		}
	},
	mutations: {
		updateUserConfig(state, { key, value }) {
			state[key] = value
		},
	},
	actions: {
		async updateUserConfig({ commit }, { key, value }) {
			commit('updateUserConfig', { key, value })
			await axios.put(generateUrl('apps/photos/api/v1/config/' + key), {
				value: (typeof value === 'string') ? value : JSON.stringify(value),
			})
			emit(configChangedEvent, { key, value })
		},
	},
}

export default module
