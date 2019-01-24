import {
  Checkbox,
  Dimmer,
  Form,
  Header,
  Input,
  List,
  Loader
} from 'semantic-ui-react';
import React, { Component } from 'react';

import Joi from 'joi-browser';
import ValidatedFormfield from './validated-form-field';
import filter from 'lodash/filter';
import find from 'lodash/find';
import get from 'lodash/get';
import has from 'lodash/has';
import indexOf from 'lodash/indexOf';
import isArray from 'lodash/isArray';
import isFunction from 'lodash/isFunction';
import keys from 'lodash/keys';
import set from 'lodash/set';
import toPath from 'lodash/toPath';
import defaultTo from 'lodash/defaultTo';

const FORM_WHITELIST = [
  Input,
  Checkbox,
  Form.Input,
  Form.TextArea,
  Form.Select,
  Form.Checkbox
];

const IGNORE_CHILDREN = [];

export default class SemanticUiReactValidatedForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      formData:
        (typeof props.intialValue === 'function'
          ? props.intialValue()
          : props.intialValue) || {},
      validateSchema: props.validateSchema || {},
      activeSchema: {},
      validationResult: { error: null },
      hasBeenSubmitted: false, //dirty-check for submitted,
      arrayChanged: '' //array update dirty-check
    };
  }
  render() {
    const submittingIndicator = this.props.submitting
      ? this.renderLoader()
      : null;

    return (
      <Form>
        {this.transformForm(this)}
        {submittingIndicator}
      </Form>
    );
  }

  componentDidUpdate(prevProps, prevState, snapshot) {}

  getSnapshotBeforeUpdate(prevProps, prevState) {
    const { submitting, value, onChange, onSubmit } = this.props;
    const { formData, validateSchema } = this.state;
    const wereSubmitting = prevProps.submitting;

    if (submitting && !wereSubmitting) {
      const model = value || formData;
      const validationResult = Joi.validate(
        model,
        validateSchema,
        this.onBlurValidationOptions
      );

      const submittingEvent = new Event('submitting');

      onChange(
        submittingEvent,
        {
          field: prevProps,
          form: model,
          submitting: validationResult.error ? false : true
        },
        validationResult
      );

      if (!validationResult.error) {
        isFunction(onSubmit) &&
          onSubmit(
            submittingEvent,
            {
              form: model
            },
            validationResult
          );
      }
      this.setState({
        hasBeenSubmitted: true,
        validationResult: validationResult,
        activeSchema: validateSchema,
        arrayChanged: ''
      });
      return null;
    }

    const previousModel = prevProps.value || prevState.formData;
    const model = value || formData;

    const arrayChanged = this.arrayChanged(previousModel, model);

    if (arrayChanged) {
      const arrayChangedEvent = new Event('arraychanged');
      const validationResult = Joi.validate(
        model,
        this.state.activeSchema,
        this.onBlurValidationOptions
      );
      onChange(
        arrayChangedEvent,
        {
          field: model[arrayChanged],
          form: model,
          submitting: false
        },
        validationResult
      );
      this.setState({
        formData: model,
        validationResult: validationResult,
        arrayChanged: arrayChanged
      });

      return null;
    }

    return null;
  }

  transformForm = node => {
    const { children } = node.props;

    if (this.hasNoChildren(node)) {
      return [];
    }

    function childToTranformedChild(child) {
      if (!child || child.props === undefined) {
        return child;
      } else if (this.hasNoChildren(child)) {
        return this.processElement(child, null);
      } else {
        return this.processElement(child, this.transformForm(child));
      }
    }
    return React.Children.map(children, childToTranformedChild.bind(this));
  };

  processElement = (child, nextLeaf) => {
    const { readOnly, value } = this.props;
    const { formData, validateSchema } = this.state;

    const model = value || formData;
    let el = child;

    if (this.childShouldBeModified(el)) {
      const { name } = el.props;

      const isReadOnly = readOnly === true;

      let extendedBehavior = isReadOnly
        ? {}
        : {
            onChange: this.formOnChange(el),
            onBlur: this.formOnBlur(el),
            hidereadonly: el.props.hidereadonly ? 1 : 0
          };

      let newVal = null;
      if (has(model, name)) {
        let valueOperator = 'value';
        if (el.type === Form.Checkbox) {
          valueOperator = 'checked';
        }

        newVal = get(model, name);
        extendedBehavior[valueOperator] = newVal;
      }

      //TODO: handle any manner of pre-error-decoration.
      if (validateSchema.hasOwnProperty(name) && !isReadOnly) {
        const thisValidator = validateSchema[name];
        const _flags = thisValidator._flags;
        //FORM IS REQUIRED
        if (
          _flags &&
          _flags.presence &&
          _flags.presence === 'required' &&
          el.props.label.trim()
        ) {
          extendedBehavior.required = true;
        }
      }

      const inError = this.childIsInError(el);
      const isFocused = this.childIsInFocus(el);

      if (isReadOnly) {
        el = this.fieldToReadOnly(el);
      }

      let _props = {
        newValue: newVal,
        isFocused: isFocused,
        inError: inError,
        readOnly: isReadOnly,
        trigger: React.cloneElement(el, {
          ...extendedBehavior,
          ...{ error: inError }
        }),
        content: inError ? this.renderErrorMessage(el) : null,
        on: this.popupInteractionStates,
        arrayChanged: this.thisArrayChangedWhenProcessingElement(name)
      };

      if (!inError) {
        _props.open = false;
      }

      if (isFocused) {
        _props.open = inError;
      }

      el = <ValidatedFormfield {..._props} />;
    }

    return nextLeaf
      ? React.cloneElement(el, {}, nextLeaf)
      : React.cloneElement(el, {});
  };

  // if it was an array that was updated that feeds a child property
  // such as adding or removing things
  // this gives you that array's key
  arrayChanged = (previousModel, model) => {
    let _keys = keys(model);
    let changedArrayKeys = filter(_keys, key => {
      if (!isArray(model[key])) {
        return false;
      }
      if (model[key].length === previousModel[key].length) {
        return false;
      }
      return true;
    });

    if (!changedArrayKeys.length) {
      return false;
    }

    return changedArrayKeys[0];
  };

  isValidType = child => {
    return child.type === Input;
  };

  hasNoChildren = node => {
    //halt processing on no children
    if (this.childShouldIgnoreChildren(node)) {
      return true;
    }

    return React.Children.count(node.props.children) < 1;
  };

  popupInteractionStates = ['focus', 'hover', 'click'];
  onBlurValidationOptions = {
    allowUnknown: true,
    abortEarly: false
  };

  targetFormTypes = () => {
    return FORM_WHITELIST.concat(this.props.whitelist || []);
  };
  haltOnFormTypes = () => {
    return IGNORE_CHILDREN.concat(this.props.ignoreChildrenList || []);
  };

  trueIfAnyAreTrue = child => (acc, type) => {
    if (acc) {
      return true;
    }
    return child.type === type;
  };

  childShouldIgnoreChildren = child => {
    return this.haltOnFormTypes().reduce(this.trueIfAnyAreTrue(child), false);
  };

  childShouldBeModified = child => {
    return this.targetFormTypes().reduce(this.trueIfAnyAreTrue(child), false);
  };

  propertyExistsOnModel = (prop, model) => {
    if (!prop) {
      return false;
    }

    let _props = prop.split('.');

    let _check = model;
    while (_props.length) {
      let next = _props.shift();
      if (has(_check, next)) {
        _check = get(_check, next);
      } else {
        return false;
      }
    }

    return true;
  };

  fieldToReadOnly = el => {
    const { value } = this.props;
    const { formData } = this.state;

    const model = value || formData;

    //TODO: can override the 'read only' slug by field type!
    //TODO: refactor this into an extendable strategy!
    if (el.props.hidereadonly) {
      return <span />;
    }

    // Pull out the hide on read only, and only
    // pass down ones that don't freak make warnings.
    const { hidereadonly, ..._elProps } = el.props;
    let _val =
      _elProps.value || this.propertyExistsOnModel(_elProps.name, model)
        ? get(model, _elProps.name)
        : ' ';

    if (el.type === Form.TextArea) {
      return (
        <Form.Field>
          <label>{`${_elProps.label}`}</label>
          <p>
            {`${_val}`}
            &nbsp;
          </p>
        </Form.Field>
      );
    }

    if (el.type === Form.Select) {
      if (_elProps.options) {
        let item = find(_elProps.options, { value: _val });
        _val = item ? item.text : '';
      }
      return (
        <Form.Field>
          <label>{`${_elProps.label}`}</label>
          <p>
            {`${_val}`}
            &nbsp;
          </p>
        </Form.Field>
      );
    }

    return (
      <Form.Field {..._elProps}>
        <label>
          {`${_val}`}
          &nbsp;
        </label>
      </Form.Field>
    );
  };

  formOnChange = el => {
    return (event, data) => {
      const { onChange, value, submitting } = this.props;

      const { formData, activeSchema } = this.state;

      const model = value || formData;

      if (el.props.onChange && typeof el.props.onChange === 'function') {
        el.props.onChange(event, data);
      }

      if (this.propertyExistsOnModel(el.props.name, model)) {
        let updatedField = model;

        let valueOperator = 'value';
        if (el.type === Form.Checkbox) {
          valueOperator = 'checked';
        }

        set(updatedField, el.props.name, data[valueOperator]);

        let updatedForm = { ...model, ...updatedField };

        const validationResult = Joi.validate(
          updatedForm,
          activeSchema,
          this.onBlurValidationOptions
        );

        this.setState({
          formData: updatedForm,
          validationResult: validationResult,
          arrayChanged: ''
        });

        onChange(
          event,
          { field: data, form: updatedForm, submitting: submitting },
          validationResult
        );
      }
    };
  };

  shouldExtendBlurValidationSchema = el => {
    const { validateSchema } = this.props;
    const { activeSchema } = this.state;

    let _name = toPath(el.props.name);
    const notYetAttached = !get(activeSchema, _name[0]);
    const shouldBeAttached = get(validateSchema, _name[0]);
    return notYetAttached && shouldBeAttached;
  };

  getInnerSchema(schema, path) {
    if(schema.schemaType !== 'array') {
      return defaultTo(get(schema, path[0]), schema);
    }

    let inner = schema._inner.items[0]._inner.children.find(x => x.key === path[2]).schema;
    if(inner.schemaType !== 'array') {
      return inner;
    }

    return this.getInnerSchema(inner, path.slice(2))
  }

  formOnBlur = el => {
    return event => {
      const { onChange, value, validateSchema, submitting } = this.props;

      const { formData, activeSchema } = this.state;

      const model = value || formData;

      if (this.propertyExistsOnModel(el.props.name, model)) {
        if (validateSchema && validateSchema.isJoi) {
          console.log(
            'You need to use a simple object for the Joi root schema, but the props are Joi models.'
          );
        }

        let blurSchemaExtension = {};
        let _name = toPath(el.props.name);
        let _value = this.getInnerSchema(validateSchema, _name);
        if (this.shouldExtendBlurValidationSchema(el)) {
          set(blurSchemaExtension, _name[0], _value);
        }

        let valueOrInner = this.getInnerSchema(_value, _name);
        if (valueOrInner.schemaType === 'number') {
          let value = defaultTo(parseFloat(get(model, _name)), 0);
          set(model, _name, value);
        }

        const blurSchema = { ...activeSchema, ...blurSchemaExtension };
        const validationResult = Joi.validate(
          model,
          blurSchema,
          this.onBlurValidationOptions
        );

        this.setState({
          formData: model,
          validationResult: validationResult,
          activeSchema: blurSchema,
          arrayChanged: ''
        });

        onChange(
          event,
          { field: el.props, form: model, submitting: submitting },
          validationResult
        );
      }

      if (el.props.onBlur && typeof el.props.onBlur === 'function') {
        el.props.onBlur(event, el.props);
      }
    };
  };

  fieldErrorDetails = el => {
    const { validationResult } = this.state;
    return get(validationResult, 'error.details', []).filter(detail => {
      let _name = toPath(el.props.name);

      return (
        detail.context.key === _name ||
        detail.path.join('.') == _name ||
        detail.path.join('.') == _name.join('.')
      );
    });
  };

  childIsInError = el => {
    return !!this.fieldErrorDetails(el).length;
  };

  childIsInFocus = el => {
    return el.props.name === document.activeElement.name;
  };

  nothingIsInFocus = () => {
    return document.activeElement.name === undefined;
  };

  renderErrorMessage = el => {
    const details = this.fieldErrorDetails(el);

    function detailToHtml(detail, index) {
      return (
        <List.Item key={`${detail.key}-${index}`}>
          <List.Icon name="warning circle" color="red" />
          {detail.message.replace(el.props.label, '').replace(/""/, '')}
        </List.Item>
      );
    }

    return (
      <div>
        <Header>{el.props.label}</Header>
        <List error>{details.map(detailToHtml)}</List>
      </div>
    );
  };

  // When processing, if an array was changed
  // this determines if the processed element  was contained
  // in the array thus forcing an update to prevent undiffed elements
  thisArrayChangedWhenProcessingElement = name => {
    const whichArrayChanged = this.state.arrayChanged;
    if (!whichArrayChanged) {
      return false;
    }
    return name.indexOf(whichArrayChanged) > -1;
  };

  renderLoader = () => {
    return (
      <Dimmer active inverted>
        <Loader size="tiny">{this.props.submitMessage || 'Submitting'}</Loader>
      </Dimmer>
    );
  };
}
