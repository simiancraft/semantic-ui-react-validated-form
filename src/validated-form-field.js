import React, { Component } from "react";

import { Popup } from "semantic-ui-react";
import _ from "lodash";
import isArray from "lodash/isArray";
import isEqual from "lodash/isEqual";

export default class ValidatedFormfield extends Component {
  shouldComponentUpdate(nextProps, nextState) {
    const didChange =
      !isEqual(nextProps.newValue, this.props.newValue) ||
      nextProps.inError !== this.props.inError ||
      nextProps.isFocused !== this.props.isFocused ||
      nextProps.readOnly !== this.props.readOnly ||
      isArray(nextProps.newValue) ||
      nextProps.arrayChanged ||
      false;
    return didChange;
  }

  render() {
    return <Popup {...this.props} />;
  }
}
