import React, { useState, useEffect, useRef } from 'react';
import useOutsideClick from './useOutsideClick';
import { Dimmer, Loader } from 'semantic-ui-react';
import { default as BackIcon } from '@material-ui/icons/KeyboardBackspace';
import CloseIcon from '@material-ui/icons/Close';
import SearchIcon from '@material-ui/icons/Search';
import { IconButton } from '@material-ui/core';
import { Grid } from '@giphy/react-components'
import { GiphyFetch } from '@giphy/js-fetch-api'
import { debounce } from 'lodash';


import './GifPicker.css';

const recommend = [
  "shrug", "wink", "sad", "excited", "tired", "drunk", "surprised", "bored",
  "disappointed", "relaxed", "thank you", "party", "sorry", "dancing",
  "hello", "scared", "smile", "wow", "you got this", "ok", "idk", "applause",
  "smh", "yolo", "awww", "eww", "fml", "oh no you didnt", "funny", "cute",
  "duck", "shocked", "omg", "wtf", "oops", "sigh", "want", "on snap", "pleased",
  "meh"
];

function GifPicker({
  api_key,
  open,
  width = 600,
  height,
  borderRadius,
  columns,
  onClose,
  onGifClick,
  onPickClose,
  topBarColor
}) {
  const GIFPHY_API_KEY = api_key;
  const gf = new GiphyFetch(GIFPHY_API_KEY);

  const ref = useRef(null);
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState('');
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState(null);

  const mediaMatch = window.matchMedia(`(max-width: ${Math.floor(width * 1.1)}px)`);
  const [matches, setMatches] = useState(mediaMatch.matches);

  useEffect(() => {
    const handler = e => setMatches(e.matches);
    mediaMatch.addListener(handler);
    return () => mediaMatch.removeListener(handler);
  }, []);

  const getDimension = () => {
    const w = window.innerWidth || document.body.clientWidth;

    let dimension = { width };
    if(w <= width * 1.1) {
      dimension.width = w;
    }
    return dimension;
  }

  const dimension = getDimension();
  const [wid, setWid] = useState(dimension.width);

  useEffect(() => {
    if(!open) return;

    let background = document.querySelector("#gifpicker-background");
    background.style.display = 'block';
    document.body.style.overflow = 'hidden';
    return (() => {
      document.body.style.overflow = '';
      background.style.display = 'none';
    });
  }, []);

  // trigger search only when users finish typing
  // using debounce on input event
  useEffect(() => {
    if(value === search) return;

    let timer = setTimeout(() => {
      setSearch(null);
      setSearch(value);
    }, 500);
    return(() => {
      clearTimeout(timer);
    });
  }, [value]);

  useEffect(() => {
    let timer;

    const finalResize = (s) => {
      const dimension = getDimension();
      setWid(dimension.width);
      setSearch(s);
    }

    const debounceResize = debounce((s) => finalResize(s), 150);
    const handleResize = () => {
      search && debounceResize(search);
      search && setSearch(null);
    }

    window.addEventListener('resize', handleResize);
    return (() => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    });
  }, [search]);

  useEffect(() => {
     (async function() {
       let hasError = false;
       try {
         const fetchGifsCategories = await Promise.all(recommend.map(async category => {
           try {
             let fetchCategory = await gf.search(category, { sort: 'relevant', offset: 0, limit: 1 });
             // no result for the current search
             if(fetchCategory.data.length === 0) {
               return {
                 name: category,
                 images: { '480w_still': { url: '' }}
               };
             }

             fetchCategory.data[0].name = category;
             return fetchCategory.data[0];
          }
          catch (err) {
            throw err;
          }
         }))
         setCategories(fetchGifsCategories);
      }
      catch(err) {
        hasError = true;
        // something wrong with the giphy fetch
        const msg = 'Oops. Something\'s wrong. Please close the gif panel and try again.';
        setErrMsg(msg);
      }
      finally {
        !hasError && setLoading(false);
      }
     })();
  }, []);

  const handleSelectCategory = (name) => {
    setSearch(name);
    setValue(name ? name : '');
  }

  const handleGifPick = (gif, e) => {
    e.preventDefault();
    onGifClick(gif, e);
    if(onPickClose) onClose();
  }

  const handleClose = () => {
    setValue('');
    setSearch(null);
    onClose();
  }

  // click anywhere outside to close the gif picker
  const handleOutsideClick = () => {
    open && handleClose();
  }
  useOutsideClick(ref, handleOutsideClick);

  let gifpickerContent;
  if(loading || categories.length === 0) {
    gifpickerContent = (
      <Dimmer active>
        <Loader size='large' style={{ color: 'white' }}>{errMsg}</Loader>
      </Dimmer>
    );
  }
  else if(search) {
    const searchFn = (offset) => gf.search(search, { sort: 'relevant', offset, limit: 20 });
    gifpickerContent = (
      <div className="gifpicker-categories-wrapper">
        <Grid
          width={wid}
          columns={columns ? columns : 4}
          gutter={2}
          borderRadius={0}
          fetchGifs={searchFn}
          onGifClick={handleGifPick}
        />
      </div>
    );
  }
  else {
    gifpickerContent = (
      <div className="gifpicker-categories-wrapper">
        <div className="gifpicker-categories">
          {
            categories.length > 0 && categories.map((category, i) => (
              <div
                onClick={() => handleSelectCategory(category.name)}
                key={i}
                style={{ backgroundImage: `url(${category.images['480w_still'].url})`}}>
                <span>{category.name}</span>
              </div>
            ))
          }
        </div>
      </div>
    );
  }

  return open && (
    <>
      <div
        ref={ref}
        className="gifpicker-container"
        style={{
          width: `${wid}px`,
          ...(height && { height: `${height}px` }),
          ...(Number.isInteger(borderRadius) && { borderRadius: `${borderRadius}px`}),
          ...styles.container(matches)
        }}
      >
        <div
          className="gifpicker-top"
          style={{
            ...(topBarColor && { backgroundColor: topBarColor })
          }}
        >
          {
            search ? (
              <IconButton onClick={() => handleSelectCategory(null)}>
                <BackIcon style={{ color: 'white' }}/>
              </IconButton>
            ) : (
              <IconButton onClick={handleClose}>
                <CloseIcon style={{ color: 'white' }}/>
              </IconButton>
            )
          }
          <div className="gifpicker-search">
            <SearchIcon />
            <input
              placeholder="Search for GIFs"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
        </div>
        {gifpickerContent}
      </div>
      <div id="gifpicker-background"></div>
    </>
  );
}

const styles = {
  container: fullScreen => (fullScreen ? {
      width: '100%',
      height: '100%',
      top: 0,
      left: 0,
      borderRadius: '0',
      position: 'fixed',
      margin: '0'
  }: {})
};

export default GifPicker;
