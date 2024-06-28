/**
 * SPDX-FileCopyrightText: 2023 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

// The preview service worker cache name (see webpack config)
const SWCacheName = 'images'
const hotCache = []
/**
 * Check if the preview is already cached by the service worker
 *
 * @param {string} previewUrl - The URL of the preview to check
 * @return {Promise<boolean>}
 */
export const isCachedPreview = async function(previewUrl) {
	try {
		// Browser's cache take ~100ms to check, hot cache ~10ms.
		if (!hotCache[previewUrl]) {
			const cache = await window.caches?.open(SWCacheName)
			const response = await cache?.match(previewUrl)
			hotCache[previewUrl] = response !== undefined
		}

		return hotCache[previewUrl]
	} catch {
		return false
	}
}
