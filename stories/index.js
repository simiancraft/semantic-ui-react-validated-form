import './styles/test.css';

import React from 'react';
import { storiesOf } from '@storybook/react';
import { Button, Form, List } from 'semantic-ui-react';
import Joi from 'joi-browser';

import ValidatedForm from '../index.js';

storiesOf('Button', module)
  .add('with text', () => (
    <Button>Hello Button</Button>
  ))
  .add('with some emoji', () => (
    <Button><span role="img" aria-label="so cool">😀 😎 👍 💯</span></Button>
  ));

storiesOf('ValidatedForm', module)
  .add('example form', () => {
    const initial = {
      foo: 'foo',
      bar: '',
      ban: {
        foo: '',
        bar: '',
        baz: {
          foo: '',
          bar: '',
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
