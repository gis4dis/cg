import Head from 'next/head'
import Map from '../component/Map'


class MapPage extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      showModal: false
    }
  }


  render() {

    return (
        <div className="root">
          <Head>
            <title>Cartographic Generalization Demo</title>
            <link rel='stylesheet' href='/static/ol.css'/>
          </Head>

          <Map>
          </Map>

          <style jsx>{`
.root {
  width: 100%;
  height: 100%;
}
  `}</style>
          <style jsx global>{`
*,
*:before,
*:after {
  box-sizing: inherit;
}
html {
  box-sizing: border-box;
}
body {
  font-family: 'Lato', 'Helvetica Neue', Arial, Helvetica, sans-serif
}
html, body, #__next {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}
  `}</style>
        </div>
    )

  }

}

export default MapPage;
