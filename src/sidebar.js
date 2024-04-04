/**
 * @copyright Copyright (c) 2023 Louis Chemineau <louis@chmn.me>
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
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 *
 */
import Vue from 'vue'
// eslint-disable-next-line n/no-missing-import, import/no-unresolved
import InformationOutline from '@mdi/svg/svg/information-outline.svg?raw'
import { translate as t, translatePlural as n } from '@nextcloud/l10n'
import { getRequestToken } from '@nextcloud/auth'
import { generateFilePath } from '@nextcloud/router'
import { registerDavProperty } from '@nextcloud/files'

Vue.prototype.t = t
Vue.prototype.n = n

// eslint-disable-next-line no-undef, camelcase
__webpack_nonce__ = btoa(getRequestToken() ?? '')
// eslint-disable-next-line no-undef, camelcase
__webpack_public_path__ = generateFilePath('photos', '', 'js/')

;[
	'nc:metadata-photos-size',
	'nc:metadata-files-live-photo',
	'nc:metadata-blurhash',
	'nc:metadata-photos-original_date_time',
	'nc:metadata-photos-exif',
	'nc:metadata-photos-ifd0',
	'nc:metadata-photos-gps',
	'nc:metadata-photos-place',
].forEach((prop) => registerDavProperty(prop, { nc: 'http://nextcloud.org/ns' }))

// Init Photos tab component
let PhotosTabView = null
let PhotosTabInstance = null
const photosTab = new OCA.Files.Sidebar.Tab({
	id: 'photos',
	name: t('photos', 'Details'),
	iconSvg: InformationOutline,

	async mount(el, fileInfo, context) {
		// only load if needed
		if (PhotosTabView === null) {
			const { default: PhotosTab } = await import('./views/PhotosTab.vue')
			PhotosTabView = PhotosTabView ?? Vue.extend(PhotosTab)
		}
		// destroy previous instance if available
		if (PhotosTabInstance) {
			PhotosTabInstance.$destroy()
		}
		PhotosTabInstance = new PhotosTabView({
			// Better integration with vue parent component
			parent: context,
		})
		// No need to await this, we will show a loading indicator instead
		PhotosTabInstance.update(fileInfo)
		PhotosTabInstance.$mount(el)
	},
	update(fileInfo) {
		PhotosTabInstance.update(fileInfo)
	},
	destroy() {
		PhotosTabInstance.$destroy()
		PhotosTabInstance = null
	},
})

window.addEventListener('DOMContentLoaded', async function() {
	if (OCA.Files && OCA.Files.Sidebar) {
		OCA.Files.Sidebar.registerTab(photosTab)
		const { default: PhotosTab } = await import(/* webpackPreload: true */ './views/PhotosTab.vue')
		PhotosTabView = PhotosTabView ?? Vue.extend(PhotosTab)
	}

	/**
	 *
	 * @param metadataArray
	 */
	function parseMetadataArray(metadataArray) {
		return metadataArray?.reduce((parsedArray, metadata) => ({ ...parsedArray, [metadata.nodeName]: metadata.textContent }), {})
	}

	OC.Files.getClient().addFileInfoParser(function(response) {
		return {
			'metadata-photos-original_date_time': response.propStat[0].properties[`{${OC.Files.Client.NS_NEXTCLOUD}}metadata-photos-original_date_time`],
			'metadata-photos-exif': parseMetadataArray(response.propStat[0].properties[`{${OC.Files.Client.NS_NEXTCLOUD}}metadata-photos-exif`]),
			'metadata-photos-ifd0': parseMetadataArray(response.propStat[0].properties[`{${OC.Files.Client.NS_NEXTCLOUD}}metadata-photos-ifd0`]),
			'metadata-photos-gps': parseMetadataArray(response.propStat[0].properties[`{${OC.Files.Client.NS_NEXTCLOUD}}metadata-photos-gps`]),
			'metadata-photos-place': response.propStat[0].properties[`{${OC.Files.Client.NS_NEXTCLOUD}}metadata-photos-place`],
		}
	})
})
