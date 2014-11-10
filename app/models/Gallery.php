<?php

class Gallery extends Eloquent {

    public function images() {
        return $this->hasMany('GalleryImage');
    }

}