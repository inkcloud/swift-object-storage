# Swift Object Storage

## Installation
`npm install` or `yarn install`


## Example Usage
```javascript
const config = {
  objectStorageUrl: objectStorageUrl: 'https://dal05.objectstorage.softlayer.net/auth/v1.0/
	user: 'username';
	key: 'key';

}
const client = new SwiftObjectStorage(config);

// Get remote file and store locally
client.getObjectWriteToStream(
  fs.createWriteStream('my-local-file.pdf'),
  'some-container'
  'remote-filepdf'
)
  .then() => console.log('done');
```

### Inject `onResponse` callback.

You can optionally pass an `onResponse` callback and it will be passed to Request's `.on('response')`. This is useful for when you need access to the response context

```javascript
client.getObjectWriteToStream(
  fs.createWriteStream('my-local-file.pdf'),
  'some-container'
  'remote-filepdf',
  {
    onResponse: (resp) => console.log('Response', resp);
  }
)
  .then() => console.log('done');
```
