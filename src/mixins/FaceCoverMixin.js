/**
 * SPDX-FileCopyrightText: 2022 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { mapGetters } from 'vuex'
import he from 'he'

export default {
	name: 'FaceCoverMixin',

	computed: {
		...mapGetters([
			'faces',
			'facesFiles',
			'files',
		]),
	},

	methods: {
		getFaceCover(faceName) {
			return JSON.parse(he.decode(this.faces[faceName].props['face-preview-image'] || '{}'))
		},

		/**
		 * This will produce an inline style to apply to images
		 * to zoom toward the detected face
		 *
		 * @param faceName
		 * @return {{}|{transform: string, width: string, transformOrigin: string}}
		 */
		getCoverStyle(faceName) {
			const cover = this.getFaceCover(faceName)
			if (!cover || !cover.detection) {
				return {}
			}
			const detection = cover.detection

			// Zoom into the picture so that the face fills the --photos-face-width box nicely
			// if the face is larger than the image, we don't zoom out (reason for the Math.max)
			const zoom = Math.max(1, (1 / detection.width) * 0.4)

			const horizontalCenterOfFace = (detection.x + detection.width / 2) * 100
			const verticalCenterOfFace = (detection.y + detection.height / 2) * 100

			return {
				// We assume that the image is inside a div with width: var(--photos-face-width)
				width: '100%',
				// we translate the image so that the center of the detected face is in the center of the --photos-face-width box
				// and add the zoom
				transform: `translate(calc( var(--photos-face-width)/2 - ${horizontalCenterOfFace}% ), calc( var(--photos-face-width)/2 - ${verticalCenterOfFace}% )) scale(${zoom})`,
				// this is necessary for the zoom to zoom toward the center of the face
				transformOrigin: `${horizontalCenterOfFace}% ${verticalCenterOfFace}%`,
			}
		},
	},
}
