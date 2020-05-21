import _ from 'lodash-es'
import {
	normalizeBookmark,
	normalizeMeta
} from '../../helpers/bookmarks'
import {
	insertIdToSpace,
	removeIdFromSpace
} from './utils'
import {
	BOOKMARK_CREATE_SUCCESS, BOOKMARK_CREATE_ERROR,
	BOOKMARK_UPDATE_SUCCESS, BOOKMARK_UPDATE_ERROR,
	BOOKMARK_REMOVE_SUCCESS, BOOKMARK_REMOVE_ERROR,
	BOOKMARK_UPLOAD_PROGRESS,
	BOOKMARK_IMPORTANT,
	BOOKMARK_REORDER
} from '../../constants/bookmarks'

import {
	TAG_RENAME_SUCCESS, TAG_REMOVE_SUCCESS
} from '../../constants/tags'

export default function(state, action) {
	switch (action.type) {
		//Error
		case BOOKMARK_CREATE_ERROR:
		case BOOKMARK_UPDATE_ERROR:
		case BOOKMARK_REMOVE_ERROR:{
			if (typeof action.onFail == 'function')
				action.onFail()

			return state
		}

		//Insert
		case BOOKMARK_CREATE_SUCCESS:{
			const 
				updatedItem = normalizeBookmark(action.item),
				updatedMeta = normalizeMeta(action.item)

			if (typeof action.onSuccess == 'function')
				action.onSuccess(updatedItem)

			//propogate collection id for next listeners
			action.spaceId = String(updatedItem.collectionId)

			//Insert to elements and meta
			state = state
				.setIn(['elements', updatedItem._id], updatedItem)
				.setIn(['meta', updatedItem._id], updatedMeta)

			//Insert ID to spaces
			state = insertIdToSpace(state, action.spaceId, updatedItem._id)
			state = insertIdToSpace(state, '0', updatedItem._id)

			return state
		}

		case BOOKMARK_UPDATE_SUCCESS:{
			if (typeof action.onSuccess == 'function')
				action.onSuccess()

			//propogate collection id for next listeners
			action.spaceId = []
			action.movedFromSpaceId = [];

			(Array.isArray(action.item) ? action.item : [action.item]).forEach(item=>{
				const updatedItem = normalizeBookmark(item)
				const originalItem = state.elements[updatedItem._id]

				action.spaceId.push(String(updatedItem.collectionId))

				//Maybe bookmark moved to another collection
				if (originalItem.collectionId != updatedItem.collectionId){
					//Remove from original collection
					action.movedFromSpaceId.push(String(originalItem.collectionId))
					state = removeIdFromSpace(state, String(originalItem.collectionId), originalItem._id)
				}

				//Update in spaces
				state = state.setIn(['elements', updatedItem._id], updatedItem)
				state = state.setIn(['meta', updatedItem._id], normalizeMeta(item))
			})

			//clean
			action.spaceId = _.uniq(action.spaceId)
			action.movedFromSpaceId = _.uniq(action.movedFromSpaceId)

			return state
		}

		//Remove
		case BOOKMARK_REMOVE_SUCCESS:{
			if (typeof action.onSuccess == 'function')
				action.onSuccess()

			const ids = Array.isArray(action._id) ? action._id : [action._id]

			//get spaceId
			action.spaceId = _.uniq(
				ids.map(_id=>
					state.elements[_id] && state.elements[_id].collectionId
				).filter(collectionId=>collectionId)
			)
			
			//remove from spaces
			_.forEach(state.spaces, (s, spaceId)=>{
				if (s.ids && s.ids.length)
					state = state.setIn(['spaces', spaceId, 'ids'], _.without(s.ids, ...ids))
			})

			//remove from store
			state = state
				.set('elements', state.elements.without(ids))
				.set('meta', state.meta.without(ids))

			return state
		}

		//Upload Progress
		case BOOKMARK_UPLOAD_PROGRESS:{
			//const itemId = parseInt(action._id)

			return state
		}

		//Important
		case BOOKMARK_IMPORTANT:{
			return state.setIn(['elements', action._id, 'important'], !state.elements[action._id].important)
		}

		//Reorder
		case BOOKMARK_REORDER:{
			const from = state.getIn(['elements', action._id, 'collectionId'])
			const to = action.collectionId || from
			if (!from) return state

			//source space and bookmark
			const source = [...state.spaces[from].ids]
			const sourceOrder = source.indexOf(action._id)

			//bookmark not found
			if (sourceOrder == -1){
				action.ignore = true
				return state
			}

			//nothing changed
			if (from == to && sourceOrder == action.order)
				return state

			//remove from source collection
			source.splice(sourceOrder, 1)

			//same collection
			if (from == to)
				source.splice(action.order, 0, action._id)
			//different collection
			else {
				const target = [...state.spaces[to].ids]

				target.splice(action.order, 0, action._id)

				state = state.setIn(['spaces', to, 'ids'], target)
			}

			return state
				.setIn(['elements', action._id, 'collectionId'], to)
				.setIn(['spaces', from, 'ids'], source)
		}

		//Update tags
		case TAG_RENAME_SUCCESS:{
			var remakeElements = []

			//check meta
			_.forEach(state.meta, (m, metaId)=>{
				const path=['meta', metaId, 'tags']

				state = state.setIn(path, state.getIn(path).map((tagName)=>{
					//replace with new name
					if (tagName==action.tagName){
						remakeElements.push(metaId)
						return action.newName
					}
					return tagName
				}))
			})

			//update static tags value in elements
			_.forEach(remakeElements, (_id)=>{
				state = state.setIn(['elements', _id, 'tags'], state.getIn(['meta', _id, 'tags']).join(', '))
			})

			return state
		}

		//Remove tags
		case TAG_REMOVE_SUCCESS:{
			remakeElements = []

			//check meta
			_.forEach(state.meta, (m, metaId)=>{
				const path=['meta', metaId, 'tags']
				if (state.getIn(path).some((tagName)=>tagName==action.tagName))
					remakeElements.push(metaId)

				state = state.setIn(path, state.getIn(path).filter((tagName)=>tagName!=action.tagName))
			})

			//update static tags value in elements
			_.forEach(remakeElements, (_id)=>{
				state = state.setIn(['elements', _id, 'tags'], state.getIn(['meta', _id, 'tags']).join(', '))
			})

			return state
		}
	}
}