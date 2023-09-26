/**
 * @copyright Copyright (c) 2022 Louis Chemineau <louis@chmn.me>
 *
 * @author Louis Chemineau <louis@chmn.me>
 *
 * @license AGPL-3.0-or-later
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 *
 */

import { mapActions } from 'vuex'

import { showError } from '@nextcloud/dialogs'

import AbortControllerMixin from './AbortControllerMixin.js'
import { fetchCollection, fetchCollectionFiles } from '../services/collectionFetcher.js'
import logger from '../services/logger.js'
import SemaphoreWithPriority from '../utils/semaphoreWithPriority.js'

export default {
	name: 'FetchCollectionContentMixin',

	data() {
		return {
			fetchSemaphore: new SemaphoreWithPriority(1),
			loadingCollection: false,
			loadingCollectionFiles: false,
			errorFetchingCollection: null,
			errorFetchingCollectionFiles: null,
		}
	},

	mixins: [
		AbortControllerMixin,
	],

	methods: {
		...mapActions([
			'appendFiles',
			'addCollections',
			'setCollectionFiles',
		]),
		/**
		 * @param {string} collectionFileName
		 * @param {string[]} [extraProps] - Extra properties to add to the DAV request.
		 * @param {import('webdav').WebDAVClient} [client] - The DAV client to use.
		 * @return {Promise<import('../services/collectionFetcher.js').Collection|null>}
		 */
		async fetchCollection(collectionFileName, extraProps, client) {
			if (this.loadingCollection) {
				return null
			}

			try {
				this.loadingCollection = true
				this.errorFetchingCollection = null

				const collection = await fetchCollection(collectionFileName, { signal: this.abortController.signal }, extraProps, client)
				this.addCollections({ collections: [collection] })
				return collection
			} catch (error) {
				if (error.response?.status === 404) {
					this.errorFetchingCollection = 404
					return null
				}

				this.errorFetchingCollection = error
				logger.error('[PublicCollectionContent] Error fetching collection', { error })
				showError(this.t('photos', 'Failed to fetch collection.'))
			} finally {
				this.loadingCollection = false
			}

			return null
		},

		/**
		 * @param {string} collectionFileName
		 * @param {string[]} [extraProps] - Extra properties to add to the DAV request.
		 * @param {import('webdav').WebDAVClient} [client] - The DAV client to use.
		 * @param {((value: import('../services/collectionFetcher.js').CollectionFile, index: number, array: import('../services/collectionFetcher.js').CollectionFile[]) => any)[]} [mappers] - Callback that can transform files before they are appended.
		 * @return {Promise<import('../services/collectionFetcher.js').CollectionFile[]>}
		 */
		async fetchCollectionFiles(collectionFileName, extraProps, client, mappers = []) {
			if (this.loadingCollectionFiles) {
				return []
			}

			const fetchSemaphoreSymbol = await this.fetchSemaphore.acquire()

			try {
				this.errorFetchingCollectionFiles = null
				this.loadingCollectionFiles = true

				let fetchedFiles = await fetchCollectionFiles(collectionFileName, { signal: this.abortController.signal }, extraProps, client)
				const fileIds = fetchedFiles.map(file => file.fileid.toString())

				mappers.forEach(mapper => (fetchedFiles = fetchedFiles.map(mapper)))

				this.appendFiles(fetchedFiles)

				if (fetchedFiles.length > 0) {
					await this.$store.commit('setCollectionFiles', { collectionFileName, fileIds })
				}

				return fetchedFiles
			} catch (error) {
				if (error.response?.status === 404) {
					this.errorFetchingCollectionFiles = 404
					return []
				}

				this.errorFetchingCollectionFiles = error

				showError(this.t('photos', 'Failed to fetch collections list.'))
				logger.error('[PublicCollectionContent] Error fetching collection files', { error })
			} finally {
				this.loadingCollectionFiles = false
				this.fetchSemaphore.release(fetchSemaphoreSymbol)
			}

			return []
		},
	},
}
