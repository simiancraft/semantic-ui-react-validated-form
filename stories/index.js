import './styles/test.css';

import React, {Component} from 'react';
import { storiesOf } from '@storybook/react';
import { Button, Form, List } from 'semantic-ui-react';
import Joi from 'joi-browser';
import toPath from 'lodash/toPath';

import ValidatedForm from '../index.js';

class NestedInput extends Component {
  render() {
    const props = this.props;
    return <Form.Input {...props} />
  }
}
const getElement = (field) => {
  const {label, name} = field;
  return <NestedInput label={label} name={name} />
}
storiesOf('ValidatedForm', module)
  .add('plain array', () => {
    const initial = {
      foo: [],
    };

    const validateSchema = {
      foo: Joi.array().min(1),
    }


    return (
      <ValidatedForm
        initialValue={initial}
        value={initial}
        validateSchema={validateSchema}
        whitelist={[NestedInput]}
        onChange={(e, value, validation)=>{
          console.log(value, validation);
        }}
      >
        <Form.Select
          label='foo'
          name='foo'
          multiple
          options={[
            {text: 'a', value:'a'},
            {text: 'b', value:'b'}
          ]}
        />
      </ValidatedForm>
    );
  })
  .add('nested input component', () => {
    const initial = {
      foo: 'foo',
      'bar test': ''
    };

    const validateSchema = {
      foo: Joi.number(),
      'bar test': Joi.number()
    }

    const child = getElement({label: 'bar', name: 'bar test'});

    return (
      <ValidatedForm
        initialValue={initial}
        value={initial}
        validateSchema={validateSchema}
        whitelist={[NestedInput]}
        onChange={(e, value, validation)=>{
          console.log(value, validation);
        }}
      >
        <Form.Input
          label='foo'
          name='foo'
        />
        {child}
      </ValidatedForm>
    );
  })
  .add('read only per element', () => {
    const initial = {
      foo: 'foo',
      bar: 'bax'
    };

    const validateSchema = {
      foo: Joi.number(),
      bar: Joi.number()
    }

    return (
      <ValidatedForm
        initialValue={initial}
        value={initial}
        readOnly={false}
        validateSchema={validateSchema}
        whitelist={[NestedInput]}
        onChange={(e, value, validation)=>{
          console.log(value, validation);
        }}
      >
        <Form.Input
          label='foo'
          name='foo'
          readOnly={false}
        />
        <Form.Input
          label='bar'
          name='bar'
          readOnly={true}
        />

      </ValidatedForm>
    );
  })

  .add('example form', () => {
    const initial = {
      foo: 'foo',
      bar: '',
      ban: {
        foo: '',
        bar: '',
        baz: {
          foo: '',
          bar: 'baz',
        }
      },
      baz: [{
        key: '',
        value: ''
      },{
        key: '',
        value: ''
      }]
    };

    const validateSchema = {
      foo: Joi.number(),
      bar: Joi.number(),
      ban: Joi.object({
        foo: Joi.number(),
        bar: Joi.string().required(),
        baz: Joi.object({
          foo: Joi.number(),
          bar: Joi.string().required()
        })
      }),
      baz: Joi.array().items(Joi.object({
        key: Joi.string(),
        value: Joi.number()
      }))
    }

    let toListItem = (item,i) => {
      return (
        <List.Item key={`list-${i}`}>
          <List.Content>
            <Form.Input
              label='key'
              name={`baz[${i}].key`}
            />
            <Form.Input
              label='value'
              name={`baz[${i}].value`}
            />
          </List.Content>
        </List.Item>
      );
    };

    let toList = (list) => {
      console.log(list)
      return (
        <List>
          {list.map(toListItem)}
        </List>
      );
    }

    return (
      <ValidatedForm
        initialValue={initial}
        value={initial}
        validateSchema={validateSchema}
        onChange={(e, value, validation)=>{
          console.log(value, validation);
        }}
      >
        <Form.Input
          label='foo'
          name='foo'
        />
        <Form.Input
          label='bar'
          name='bar'
        />
        <Form.Input
          label='ban - foo'
          name='ban.foo'
        />
        <Form.Input
          label='ban - bar'
          name='ban.bar'
        />
        <Form.Input
          label='ban - baz - foo'
          name='ban.baz.foo'
        />
        <Form.Input
          label='ban - baz - bar'
          name='ban.baz.bar'
        />
        {toList(initial.baz)}
      </ValidatedForm>
    );
  });
