/**
 * @copyright Copyright (c) 2019 John Molakvoæ <skjnldsv@protonmail.com>
 *
 * @author John Molakvoæ <skjnldsv@protonmail.com>
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

import Vue from 'vue'
import Vuex, { Store } from 'vuex'

import files from './files.js'
import albums from './albums.js'
import publicAlbums from './publicAlbums.js'
import sharedAlbums from './sharedAlbums.js'
import collections from './collections.js'
import places from './places.js'
import faces from './faces.js'
import folders from './folders.js'
import systemtags from './systemtags.js'
import userConfig, { getFolder } from './userConfig.js'
import logger from '../services/logger.js'

Vue.use(Vuex)
export default new Store({
	modules: {
		files,
		folders,
		albums,
		sharedAlbums,
		publicAlbums,
		faces,
		systemtags,
		collections,
		places,
		userConfig,
	},

	plugins: [
		(store) => {
			// Initialize the `photosLocationFolder` state
			getFolder(store.state.userConfig.photosLocation)
				.then((value) => store.commit('updateUserConfig', { key: 'photosLocationFolder', value }))
				.catch((error) => logger.error('Could not load photos location', { error }))

			// Subscribe the store to load photos location folder when the location was changed
			store.subscribe(async (mutation, state) => {
				if (mutation.type === 'updateUserConfig' && mutation.payload.key === 'photosLocation') {
					const photosLocationFolder = await getFolder(state.userConfig.photosLocation)
					store.commit('updateUserConfig', { key: 'photosLocationFolder', value: photosLocationFolder })
				}
			})
		},
	],

	strict: process.env.NODE_ENV !== 'production',
})
