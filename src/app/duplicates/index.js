import React from 'react'
import t from '~t'

import MainWrap from '../../co/columns/mainWrap'
import Loaded from './loaded'
import Init from './init'
import Empty from './empty'
import Buy from './buy'

import Pop from '../../actions/pop'
import Toast from '../../actions/toast'
import duplicatesActions from '../../actions/duplicates'
import duplicatesStore from '../../stores/duplicates'
import UserStore from '../../stores/user'
import _ from 'lodash'

class Main extends React.Component {
	displayName = "app/duplicates"

	constructor(props) {
		super(props);

		this.buttonLabel = `${_.capitalize(t.s('move'))} ${t.s('to')} ${t.s('defaultCollection--99').toLowerCase()}`
		this.state = duplicatesStore.getState()
	}

	loadMore = ()=> {
		duplicatesActions.loadMore();
	}

	removeSelected = ()=> {
		Pop.show('loading', {title: `${this.buttonLabel}: ${this.state.selected.length} ${t.s('duplicates').toLowerCase()}`});

		duplicatesStore.onRemoveSelected()
			.then(()=>{
				Toast.show({title: t.s("bookmarksRemoved")});
				Pop.close();
			})
			.catch(()=>{
				Toast.show({title: t.s("error"), status:"error"});
				Pop.close();
			})
	}

	changeSelection = (val)=> {
		duplicatesActions.changeSelection(val);
	}

	changeSelectionRule = (val)=> {
		duplicatesActions.changeSelectionRule(val);
	}

	componentWillReceiveProps(nextProps) {
    	//duplicatesActions.load();
    }

	onDuplicatesChange = (state) => {
		this.setState(state)
	}

	componentDidMount() {
        this.unsubscribeDuplicates = duplicatesStore.listen(this.onDuplicatesChange);

        duplicatesStore.onLoad();
    }

    componentWillUnmount() {
        this.unsubscribeDuplicates();
    }

	render() {
		if (!UserStore.isPro())
			return <Buy {...this.props} />

		switch(this.state.step){
			case "loaded":
				return <Loaded 
							{...this.props}
							{...this.state}
							buttonLabel={this.buttonLabel}
							loadMore={this.loadMore}
							changeSelectionRule={this.changeSelectionRule}
							changeSelection={this.changeSelection}
							removeSelected={this.removeSelected} />
			break;

			case "empty":
				return <Empty {...this.props} />
			break;

			default:
				return <Init {...this.props} />
			break;
		}
	}
}

export default MainWrap(Main)